package com.madpix.api.drawing

import com.madpix.api.common.WordFilter
import com.madpix.api.common.badRequest
import com.madpix.api.common.conflict
import com.madpix.api.common.notFound
import com.madpix.api.player.Player
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import tools.jackson.module.kotlin.readValue
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.random.Random

/**
 * The rules. Artist 1 starts drawing right away; others join with the invite code at
 * any time and take the next open spot. Turns go in spot order. If the next spot is
 * still empty, the drawing waits there until someone joins.
 *
 * Public drawings can also be joined by anyone through "Play now". In public drawings and
 * rematches, each turn has [turnTimeout]: an artist who doesn't fold in time loses their spot,
 * and it opens up for someone else.
 */
@Service
class DrawingService(
    private val drawings: DrawingRepository,
    private val json: ObjectMapper,
    private val events: ApplicationEventPublisher,
    private val clock: Clock,
    @Value("\${madpix.turn-timeout:PT12H}") private val turnTimeout: Duration,
    /** How often "Play now" starts a new drawing even when there's one to join, so it's not always the same few players starting. */
    @Value("\${madpix.play-now.create-chance:0.2}") private val createChance: Double,
) {
    private val random = Random.Default

    @Transactional
    fun create(me: Player, artistCount: Int, prompt: String?, public: Boolean = false): DrawingView {
        if (artistCount !in Geometry.MIN_ARTISTS..Geometry.MAX_ARTISTS) {
            badRequest("Artists must be ${Geometry.MIN_ARTISTS} to ${Geometry.MAX_ARTISTS}")
        }
        checkOpenDrawings(me)
        val row = newDrawing(me, artistCount, cleanPrompt(prompt), if (public) Visibility.PUBLIC else Visibility.PRIVATE)
        drawings.insertSeat(row.id, 0, me.id, row.createdAt)
        return view(row, drawings.seats(row.id), me)
    }

    /**
     * "Play now": a spot in a public drawing where it's my turn right away. If there isn't one
     * (or, now and then, even if there is), starts a new public drawing with random settings.
     * [prompt] is an inspo word the app picked, used if the new drawing gets one.
     */
    @Transactional
    fun playNow(me: Player, prompt: String?): DrawingView {
        expireTurns()
        checkOpenDrawings(me)
        val found = if (random.nextDouble() < createChance) null else drawings.findPlayable(me.id)
        if (found == null) {
            val count = randomArtistCount()
            val word = if (random.nextDouble() < INSPO_CHANCE) cleanPrompt(prompt) else null
            val row = newDrawing(me, count, word, Visibility.PUBLIC)
            drawings.insertSeat(row.id, 0, me.id, row.createdAt)
            return view(row, drawings.seats(row.id), me)
        }
        return takeSpot(me, found, drawings.seats(found.id))
    }

    fun invite(code: String): InviteView {
        val normalized = InviteCodes.normalize(code)
        val d = drawings.findByInviteCode(normalized) ?: notFound(NO_CODE)
        val seats = drawings.seats(d.id)
        return InviteView(
            inviteCode = normalized,
            artistCount = d.artistCount,
            artists = seats.map { it.playerName },
            spotsLeft = d.artistCount - seats.size,
            finished = d.finishedAt != null,
        )
    }

    /** Takes the next open spot. Joining a drawing you're already in just returns it. */
    @Transactional
    fun join(me: Player, code: String): DrawingView {
        val d = drawings.findByInviteCode(InviteCodes.normalize(code)) ?: notFound(NO_CODE)
        val seats = drawings.seats(d.id)
        if (seats.any { it.playerId == me.id }) return view(d, seats, me)
        if (d.finishedAt != null) conflict("This drawing is already finished")
        if (seats.size >= d.artistCount) conflict("This drawing is full")
        checkOpenDrawings(me)
        return takeSpot(me, d, seats)
    }

    private fun takeSpot(me: Player, d: DrawingRow, seats: List<SeatRow>): DrawingView {
        val now = clock.instant()
        drawings.insertSeat(d.id, seats.size, me.id, now)
        // Joining into the spot whose turn it is starts the clock on that turn.
        val turn = seats.count { it.submittedAt != null }
        if (turn == seats.size) drawings.startTurn(d.id, now)
        // The last spot is taken: free the code for another drawing.
        val full = seats.size + 1 == d.artistCount
        if (full) drawings.clearInviteCode(d.id)
        return view(drawings.find(d.id)!!, drawings.seats(d.id), me)
    }

    /**
     * "Draw again" on a finished drawing: a new private drawing with the same artists. Whoever asks
     * goes first and the rest are shuffled. Artists who blocked (or were blocked by) the asker, or
     * deleted their data, are left out and their spots stay open for the invite code. Each finished
     * drawing gets one rematch: asking again returns it.
     */
    @Transactional
    fun rematch(me: Player, id: String, prompt: String?): DrawingView {
        val d = drawings.find(id) ?: notFound("No such drawing")
        val seats = drawings.seats(id)
        if (seats.none { it.playerId == me.id }) notFound("No such drawing")
        if (d.finishedAt == null) conflict("This drawing isn't finished yet")
        drawings.findRematch(id)?.let { existing ->
            val existingSeats = drawings.seats(existing.id)
            if (existingSeats.none { it.playerId == me.id }) conflict("The rematch already started without you")
            return view(existing, existingSeats, me)
        }
        checkOpenDrawings(me)
        val others = seats.map { it.playerId }.distinct() - me.id
        val leftOut = drawings.blockedEitherWay(me.id) + drawings.deletedPlayers(others)
        val invited = others.filter { it !in leftOut }.shuffled(random)
        val word = if (d.prompt != null) cleanPrompt(prompt) else null
        val row = newDrawing(me, d.artistCount, word, Visibility.PRIVATE, rematchOf = id, full = invited.size + 1 == d.artistCount)
        (listOf(me.id) + invited).forEachIndexed { pos, playerId -> drawings.insertSeat(row.id, pos, playerId, row.createdAt) }
        return view(row, drawings.seats(row.id), me)
    }

    /** Never share a public drawing (or a rematch) with the artist in [position] again. */
    @Transactional
    fun block(me: Player, id: String, position: Int) {
        val seats = drawings.seats(id)
        if (seats.none { it.playerId == me.id }) notFound("No such drawing")
        val target = seats.find { it.position == position } ?: notFound("Nobody is in that spot")
        if (target.playerId == me.id) badRequest("You can't block yourself")
        drawings.insertBlock(me.id, target.playerId, clock.instant())
    }

    /**
     * Takes away turns that ran past [turnTimeout] in public drawings and rematches. The spot
     * opens up again (with an invite code), later artists move up, and a drawing left empty is
     * deleted. Runs every few minutes, and before "Play now" looks for a drawing.
     */
    @Transactional
    fun expireTurns() {
        val now = clock.instant()
        for (d in drawings.findTimedOpen()) {
            val seats = drawings.seats(d.id)
            val turn = seats.count { it.submittedAt != null }
            val seat = seats.find { it.position == turn } ?: continue
            if (Duration.between(turnStart(d, seat), now) < turnTimeout) continue
            log.info("Turn timed out: drawing={} player={}", d.id, seat.playerId)
            removeSeat(d, seats, seat)
        }
    }

    fun list(me: Player): List<DrawingView> {
        val rows = drawings.findForPlayer(me.id, limit = 100)
        val seatsByDrawing = drawings.seats(rows.map { it.id }).groupBy { it.drawingId }
        return rows.map { view(it, seatsByDrawing[it.id].orEmpty(), me, withStrokes = false) }
    }

    fun get(me: Player, id: String): DrawingView {
        val d = drawings.find(id) ?: notFound("No such drawing")
        val seats = drawings.seats(id)
        // Private drawings are invisible to anyone who hasn't joined.
        if (seats.none { it.playerId == me.id }) notFound("No such drawing")
        return view(d, seats, me)
    }

    /** Folds my strip. Then it's the next artist's turn, or the drawing is done. */
    @Transactional
    fun submitStrip(me: Player, id: String, strokes: List<Stroke>): DrawingView {
        val d = drawings.find(id) ?: notFound("No such drawing")
        val seats = drawings.seats(id)
        val mine = seats.find { it.playerId == me.id } ?: notFound("No such drawing")
        if (d.finishedAt != null) conflict("This drawing is already finished")
        val turn = seats.count { it.submittedAt != null }
        if (mine.position != turn) conflict("It's not your turn")
        validateStrokes(strokes, d.stripH)

        val now = clock.instant()
        drawings.submitStrip(id, mine.position, json.writeValueAsString(strokes), now)
        drawings.startTurn(id, now)
        val next = turn + 1
        if (next == d.artistCount) {
            drawings.finish(id, now)
            events.publishEvent(DrawingFinished(id, seats.map { it.playerId }, me.id))
        } else {
            // If nobody has the next spot yet, there's no one to tell; they'll start when they join.
            seats.find { it.position == next }?.let {
                events.publishEvent(TurnStarted(id, it.playerId, me.name))
            }
        }
        return get(me, id)
    }

    /** Flags a drawing for a look. Only its artists can see it, so only they can report it. */
    @Transactional
    fun report(me: Player, id: String, reason: String?) {
        get(me, id)
        drawings.insertReport(id, me.id, reason?.trim()?.ifEmpty { null }, clock.instant())
        log.warn("Drawing reported: drawing={} reporter={} reason={}", id, me.id, reason)
    }

    /**
     * For "Delete my data": gives up every spot I haven't drawn in yet. Drawings with only me in
     * them go away. In others, the artists after me move up a spot, the invite code comes back if
     * the drawing was full, and whoever's turn it becomes gets told. Strips I already folded stay.
     */
    @Transactional
    fun leaveUnfinished(me: Player) {
        for (d in drawings.findOpenForPlayer(me.id)) {
            val seats = drawings.seats(d.id)
            val mine = seats.first { it.playerId == me.id }
            if (mine.submittedAt == null) removeSeat(d, seats, mine)
        }
    }

    /**
     * Takes [gone] (who hasn't folded) out of [d]. A drawing left empty is deleted. Otherwise
     * the artists after them move up a spot, the invite code comes back if the drawing was full,
     * and whoever's turn it becomes gets told (and a fresh turn clock).
     */
    private fun removeSeat(d: DrawingRow, seats: List<SeatRow>, gone: SeatRow) {
        if (seats.size == 1) {
            drawings.delete(d.id)
            return
        }
        val turn = seats.count { it.submittedAt != null }
        val hadTurn = seats.find { it.position == turn }?.playerId
        drawings.deleteSeat(d.id, gone.position)
        // Everyone after them hasn't folded yet (turns go in order), so moving them up is safe.
        seats.filter { it.position > gone.position }.sortedBy { it.position }.forEach {
            drawings.moveSeat(d.id, it.position, it.position - 1)
        }
        if (d.inviteCode == null) drawings.setInviteCode(d.id, newInviteCode())
        val after = drawings.seats(d.id)
        val hasTurn = after.find { it.position == turn }
        if (hasTurn?.playerId != hadTurn) drawings.startTurn(d.id, clock.instant())
        if (hasTurn != null && hasTurn.playerId != hadTurn) {
            val previous = after.find { it.position == turn - 1 }?.playerName
            events.publishEvent(TurnStarted(d.id, hasTurn.playerId, previous))
        }
    }

    private fun newDrawing(
        me: Player,
        artistCount: Int,
        prompt: String?,
        visibility: Visibility,
        rematchOf: String? = null,
        full: Boolean = false,
    ): DrawingRow {
        val now = clock.instant()
        val row = DrawingRow(
            id = UUID.randomUUID().toString(),
            inviteCode = if (full) null else newInviteCode(),
            artistCount = artistCount,
            stripH = Geometry.STRIP_H,
            prompt = prompt,
            createdBy = me.id,
            createdAt = now,
            finishedAt = null,
            visibility = visibility,
            rematchOf = rematchOf,
        )
        drawings.insert(row)
        return row
    }

    private fun cleanPrompt(prompt: String?): String? {
        val word = prompt?.trim()?.lowercase()?.ifEmpty { null } ?: return null
        if (!WordFilter.allowed(word)) badRequest("That inspo word isn't allowed. Try another one.")
        return word
    }

    /** 2 artists half the time, 3 about a third, 4 the rest. */
    private fun randomArtistCount(): Int {
        val r = random.nextDouble()
        return when {
            r < 0.5 -> 2
            r < 0.8 -> 3
            else -> 4
        }
    }

    /** When [seat]'s turn began: when the turn moved to their spot, or when they took it, whichever is later. */
    private fun turnStart(d: DrawingRow, seat: SeatRow): Instant = maxOf(d.turnStartedAt, seat.joinedAt)

    private fun checkOpenDrawings(me: Player) {
        if (drawings.countOpenForPlayer(me.id) >= MAX_OPEN_DRAWINGS) {
            conflict("You're in $MAX_OPEN_DRAWINGS unfinished drawings already. Finish a few first!")
        }
    }

    private fun view(d: DrawingRow, seats: List<SeatRow>, me: Player, withStrokes: Boolean = true): DrawingView {
        val mine = seats.first { it.playerId == me.id }
        val turn = seats.count { it.submittedAt != null }
        val finished = d.finishedAt != null
        val myTurn = !finished && mine.position == turn
        val byPosition = seats.associateBy { it.position }
        val current = byPosition[turn]
        return DrawingView(
            id = d.id,
            visibility = d.visibility,
            inviteCode = d.inviteCode,
            artistCount = d.artistCount,
            stripH = d.stripH,
            prompt = d.prompt,
            status = if (finished) DrawingView.Status.FINISHED else DrawingView.Status.DRAWING,
            turn = turn,
            artists = (0 until d.artistCount).map { pos ->
                val seat = byPosition[pos]
                ArtistView(
                    position = pos,
                    name = seat?.playerName,
                    joined = seat != null,
                    done = seat?.submittedAt != null,
                    isMe = seat?.playerId == me.id,
                )
            },
            myPosition = mine.position,
            myTurn = myTurn,
            waitingForArtist = !finished && byPosition[turn] == null,
            sliver = if (withStrokes && myTurn && turn > 0) {
                sliverOf(strokesOf(byPosition.getValue(turn - 1)), d.stripH)
            } else {
                null
            },
            strips = if (withStrokes && finished) seats.map(::strokesOf) else null,
            turnEndsAt = if (d.timed && !finished && current != null) turnStart(d, current) + turnTimeout else null,
            rematchOf = d.rematchOf,
            createdAt = d.createdAt,
            finishedAt = d.finishedAt,
        )
    }

    private fun strokesOf(seat: SeatRow): List<Stroke> = seat.strokes?.let { json.readValue(it) } ?: emptyList()

    private fun newInviteCode(): String {
        repeat(50) {
            val code = InviteCodes.random()
            if (!drawings.inviteCodeTaken(code)) return code
        }
        error("Couldn't find a free invite code")
    }

    private companion object {
        val log: Logger = LoggerFactory.getLogger(DrawingService::class.java)

        /** Keeps one player (or script) from holding spots in endless drawings. */
        const val MAX_OPEN_DRAWINGS = 20

        /** How often a drawing started by "Play now" gets an inspo word. */
        const val INSPO_CHANCE = 0.85
        const val NO_CODE = "No open drawing with that code. Check the spelling, or it may be full already."
    }
}
