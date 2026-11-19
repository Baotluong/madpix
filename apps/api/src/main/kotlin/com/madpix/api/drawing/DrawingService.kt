package com.madpix.api.drawing

import com.madpix.api.common.badRequest
import com.madpix.api.common.conflict
import com.madpix.api.common.notFound
import com.madpix.api.player.Player
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import tools.jackson.module.kotlin.readValue
import java.security.SecureRandom
import java.time.Clock
import java.util.UUID

/**
 * The rules. Artist 1 starts drawing right away; others join with the invite code at
 * any time and take the next open spot. Turns go in spot order. If the next spot is
 * still empty, the drawing waits there until someone joins.
 */
@Service
class DrawingService(
    private val drawings: DrawingRepository,
    private val json: ObjectMapper,
    private val events: ApplicationEventPublisher,
    private val clock: Clock,
) {
    @Transactional
    fun create(me: Player, artistCount: Int, prompt: String?): DrawingView {
        if (artistCount !in Geometry.MIN_ARTISTS..Geometry.MAX_ARTISTS) {
            badRequest("Artists must be ${Geometry.MIN_ARTISTS} to ${Geometry.MAX_ARTISTS}")
        }
        val now = clock.instant()
        val row = DrawingRow(
            id = UUID.randomUUID().toString(),
            inviteCode = newInviteCode(),
            artistCount = artistCount,
            stripH = Geometry.STRIP_H,
            prompt = prompt?.trim()?.lowercase()?.ifEmpty { null },
            createdBy = me.id,
            createdAt = now,
            finishedAt = null,
        )
        drawings.insert(row)
        drawings.insertSeat(row.id, 0, me.id, now)
        return view(row, drawings.seats(row.id), me)
    }

    fun invite(code: String): InviteView {
        val d = drawings.findByInviteCode(normalize(code)) ?: notFound("No drawing with that code")
        val seats = drawings.seats(d.id)
        return InviteView(
            inviteCode = d.inviteCode,
            artistCount = d.artistCount,
            artists = seats.map { it.playerName },
            spotsLeft = d.artistCount - seats.size,
            finished = d.finishedAt != null,
        )
    }

    /** Takes the next open spot. Joining a drawing you're already in just returns it. */
    @Transactional
    fun join(me: Player, code: String): DrawingView {
        val d = drawings.findByInviteCode(normalize(code)) ?: notFound("No drawing with that code")
        val seats = drawings.seats(d.id)
        if (seats.any { it.playerId == me.id }) return view(d, seats, me)
        if (d.finishedAt != null) conflict("This drawing is already finished")
        if (seats.size >= d.artistCount) conflict("This drawing is full")
        drawings.insertSeat(d.id, seats.size, me.id, clock.instant())
        return view(d, drawings.seats(d.id), me)
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

    private fun view(d: DrawingRow, seats: List<SeatRow>, me: Player, withStrokes: Boolean = true): DrawingView {
        val mine = seats.first { it.playerId == me.id }
        val turn = seats.count { it.submittedAt != null }
        val finished = d.finishedAt != null
        val myTurn = !finished && mine.position == turn
        val byPosition = seats.associateBy { it.position }
        return DrawingView(
            id = d.id,
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
            createdAt = d.createdAt,
            finishedAt = d.finishedAt,
        )
    }

    private fun strokesOf(seat: SeatRow): List<Stroke> = seat.strokes?.let { json.readValue(it) } ?: emptyList()

    private fun newInviteCode(): String {
        repeat(20) {
            val code = (1..CODE_LENGTH).map { CODE_ALPHABET[random.nextInt(CODE_ALPHABET.length)] }.joinToString("")
            if (!drawings.inviteCodeTaken(code)) return code
        }
        error("Couldn't find a free invite code")
    }

    private fun normalize(code: String) = code.trim().uppercase()

    private companion object {
        /** No 0/O, 1/I/L: codes get read aloud and typed on phones. */
        const val CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
        const val CODE_LENGTH = 6
        val random = SecureRandom()
    }
}
