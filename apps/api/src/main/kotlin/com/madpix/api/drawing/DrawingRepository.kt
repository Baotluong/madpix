package com.madpix.api.drawing

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant

data class DrawingRow(
    val id: String,
    /** Null once every spot is taken. */
    val inviteCode: String?,
    val artistCount: Int,
    val stripH: Int,
    val prompt: String?,
    val createdBy: String,
    val createdAt: Instant,
    val finishedAt: Instant?,
    val visibility: Visibility = Visibility.PRIVATE,
    /** The finished drawing this one is a rematch of. */
    val rematchOf: String? = null,
    /** When the current turn began. */
    val turnStartedAt: Instant = createdAt,
) {
    /** Public drawings and rematches give each turn [DrawingService] a time limit. */
    val timed get() = visibility == Visibility.PUBLIC || rematchOf != null
}

enum class Visibility { PRIVATE, PUBLIC }

data class SeatRow(
    val drawingId: String,
    val position: Int,
    val playerId: String,
    val playerName: String,
    val joinedAt: Instant,
    /** JSON list of strokes, once the artist has folded their strip. */
    val strokes: String?,
    val submittedAt: Instant?,
)

@Repository
class DrawingRepository(private val jdbc: JdbcClient) {

    fun insert(d: DrawingRow) {
        jdbc.sql(
            """
            INSERT INTO drawings (id, invite_code, artist_count, strip_h, prompt, created_by, created_at,
                                  visibility, rematch_of, turn_started_at)
            VALUES (:id, :code, :artists, :stripH, :prompt, :createdBy, :createdAt,
                    :visibility, :rematchOf, :createdAt)
            """,
        )
            .param("visibility", d.visibility.name.lowercase())
            .param("rematchOf", d.rematchOf)
            .param("id", d.id)
            .param("code", d.inviteCode)
            .param("artists", d.artistCount)
            .param("stripH", d.stripH)
            .param("prompt", d.prompt)
            .param("createdBy", d.createdBy)
            .param("createdAt", d.createdAt.toString())
            .update()
    }

    fun inviteCodeTaken(code: String): Boolean =
        jdbc.sql("SELECT COUNT(*) FROM drawings WHERE invite_code = ?").param(code)
            .query(Int::class.java).single() > 0

    fun find(id: String): DrawingRow? =
        jdbc.sql("SELECT * FROM drawings WHERE id = ?").param(id)
            .query { rs, _ -> rs.toDrawing() }.optional().orElse(null)

    fun findByInviteCode(code: String): DrawingRow? =
        jdbc.sql("SELECT * FROM drawings WHERE invite_code = ?").param(code)
            .query { rs, _ -> rs.toDrawing() }.optional().orElse(null)

    /** The player's drawings: unfinished ones first (newest first), then finished (most recent first). */
    fun findForPlayer(playerId: String, limit: Int): List<DrawingRow> =
        jdbc.sql(
            """
            SELECT d.* FROM drawings d
            JOIN seats s ON s.drawing_id = d.id
            WHERE s.player_id = ?
            ORDER BY d.finished_at IS NOT NULL, COALESCE(d.finished_at, d.created_at) DESC
            LIMIT ?
            """,
        )
            .params(playerId, limit)
            .query { rs, _ -> rs.toDrawing() }.list()

    fun seats(drawingIds: Collection<String>): List<SeatRow> =
        if (drawingIds.isEmpty()) {
            emptyList()
        } else {
            jdbc.sql(
                """
                SELECT s.*, p.name AS player_name FROM seats s
                JOIN players p ON p.id = s.player_id
                WHERE s.drawing_id IN (:ids)
                ORDER BY s.drawing_id, s.position
                """,
            )
                .param("ids", drawingIds)
                .query { rs, _ -> rs.toSeat() }.list()
        }

    fun seats(drawingId: String): List<SeatRow> = seats(listOf(drawingId))

    fun insertSeat(drawingId: String, position: Int, playerId: String, now: Instant) {
        jdbc.sql("INSERT INTO seats (drawing_id, position, player_id, joined_at) VALUES (?, ?, ?, ?)")
            .params(drawingId, position, playerId, now.toString())
            .update()
    }

    fun submitStrip(drawingId: String, position: Int, strokesJson: String, now: Instant) {
        jdbc.sql(
            """
            UPDATE seats SET strokes = ?, submitted_at = ?
            WHERE drawing_id = ? AND position = ? AND submitted_at IS NULL
            """,
        )
            .params(strokesJson, now.toString(), drawingId, position)
            .update()
    }

    /** Unfinished drawings the player has a spot in. */
    fun countOpenForPlayer(playerId: String): Int =
        jdbc.sql(
            """
            SELECT COUNT(*) FROM seats s JOIN drawings d ON d.id = s.drawing_id
            WHERE s.player_id = ? AND d.finished_at IS NULL
            """,
        )
            .param(playerId)
            .query(Int::class.java).single()

    fun findOpenForPlayer(playerId: String): List<DrawingRow> =
        jdbc.sql(
            """
            SELECT d.* FROM drawings d JOIN seats s ON s.drawing_id = d.id
            WHERE s.player_id = ? AND d.finished_at IS NULL
            """,
        )
            .param(playerId)
            .query { rs, _ -> rs.toDrawing() }.list()

    fun delete(drawingId: String) {
        jdbc.sql("DELETE FROM drawings WHERE id = ?").param(drawingId).update()
    }

    fun deleteSeat(drawingId: String, position: Int) {
        jdbc.sql("DELETE FROM seats WHERE drawing_id = ? AND position = ?").params(drawingId, position).update()
    }

    fun moveSeat(drawingId: String, from: Int, to: Int) {
        jdbc.sql("UPDATE seats SET position = ? WHERE drawing_id = ? AND position = ?")
            .params(to, drawingId, from)
            .update()
    }

    fun setInviteCode(drawingId: String, code: String) {
        jdbc.sql("UPDATE drawings SET invite_code = ? WHERE id = ?").params(code, drawingId).update()
    }

    /** Records a report. Reporting the same drawing again changes nothing. */
    fun insertReport(drawingId: String, reporterId: String, reason: String?, now: Instant) {
        jdbc.sql(
            """
            INSERT OR IGNORE INTO reports (drawing_id, reporter_id, reason, created_at)
            VALUES (:drawingId, :reporterId, :reason, :now)
            """,
        )
            .param("drawingId", drawingId)
            .param("reporterId", reporterId)
            .param("reason", reason)
            .param("now", now.toString())
            .update()
    }

    data class ReportRow(val drawingId: String, val reporterId: String, val reason: String?, val createdAt: Instant)

    /** Newest reports first, for review. */
    fun recentReports(limit: Int): List<ReportRow> =
        jdbc.sql("SELECT * FROM reports ORDER BY created_at DESC LIMIT ?")
            .param(limit)
            .query { rs, _ ->
                ReportRow(
                    drawingId = rs.getString("drawing_id"),
                    reporterId = rs.getString("reporter_id"),
                    reason = rs.getString("reason"),
                    createdAt = Instant.parse(rs.getString("created_at")),
                )
            }.list()

    /** Blanks every strip the player folded (a removed player's drawings could be the problem). */
    fun blankStrokesBy(playerId: String) {
        jdbc.sql("UPDATE seats SET strokes = '[]' WHERE player_id = ? AND strokes IS NOT NULL")
            .param(playerId)
            .update()
    }

    fun clearInviteCode(drawingId: String) {
        jdbc.sql("UPDATE drawings SET invite_code = NULL WHERE id = ?").param(drawingId).update()
    }

    fun startTurn(drawingId: String, now: Instant) {
        jdbc.sql("UPDATE drawings SET turn_started_at = ? WHERE id = ?").params(now.toString(), drawingId).update()
    }

    /**
     * The oldest public drawing [playerId] could draw in right now: a spot is open, everyone in it
     * has folded (so it's the new artist's turn at once), nobody has reported it, and nobody in it
     * blocked [playerId] or was blocked by them.
     */
    fun findPlayable(playerId: String): DrawingRow? =
        jdbc.sql(
            """
            SELECT d.* FROM drawings d
            WHERE d.visibility = 'public' AND d.finished_at IS NULL
              AND (SELECT COUNT(*) FROM seats s WHERE s.drawing_id = d.id) < d.artist_count
              AND NOT EXISTS (
                SELECT 1 FROM seats s
                WHERE s.drawing_id = d.id AND (s.submitted_at IS NULL OR s.player_id = :me))
              AND NOT EXISTS (SELECT 1 FROM reports r WHERE r.drawing_id = d.id)
              AND NOT EXISTS (
                SELECT 1 FROM seats s JOIN blocks b
                  ON (b.blocker_id = :me AND b.blocked_id = s.player_id)
                  OR (b.blocked_id = :me AND b.blocker_id = s.player_id)
                WHERE s.drawing_id = d.id)
            ORDER BY d.created_at
            LIMIT 1
            """,
        )
            .param("me", playerId)
            .query { rs, _ -> rs.toDrawing() }.optional().orElse(null)

    /** Unfinished public drawings and rematches: the ones whose turns can run out. */
    fun findTimedOpen(): List<DrawingRow> =
        jdbc.sql(
            """
            SELECT * FROM drawings
            WHERE finished_at IS NULL AND (visibility = 'public' OR rematch_of IS NOT NULL)
            """,
        ).query { rs, _ -> rs.toDrawing() }.list()

    fun findRematch(drawingId: String): DrawingRow? =
        jdbc.sql("SELECT * FROM drawings WHERE rematch_of = ?").param(drawingId)
            .query { rs, _ -> rs.toDrawing() }.optional().orElse(null)

    fun insertBlock(blockerId: String, blockedId: String, now: Instant) {
        jdbc.sql("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)")
            .params(blockerId, blockedId, now.toString())
            .update()
    }

    /** Everyone [playerId] blocked or was blocked by. */
    fun blockedEitherWay(playerId: String): Set<String> =
        jdbc.sql(
            """
            SELECT blocked_id FROM blocks WHERE blocker_id = :me
            UNION SELECT blocker_id FROM blocks WHERE blocked_id = :me
            """,
        ).param("me", playerId).query(String::class.java).list().filterNotNull().toSet()

    /** Players who used "Delete my data", among [playerIds]. */
    fun deletedPlayers(playerIds: Collection<String>): Set<String> =
        if (playerIds.isEmpty()) {
            emptySet()
        } else {
            jdbc.sql("SELECT id FROM players WHERE id IN (:ids) AND deleted_at IS NOT NULL")
                .param("ids", playerIds).query(String::class.java).list().filterNotNull().toSet()
        }

    fun finish(drawingId: String, now: Instant) {
        jdbc.sql("UPDATE drawings SET finished_at = ? WHERE id = ?").params(now.toString(), drawingId).update()
    }

    private fun ResultSet.toDrawing() = DrawingRow(
        id = getString("id"),
        inviteCode = getString("invite_code"),
        artistCount = getInt("artist_count"),
        stripH = getInt("strip_h"),
        prompt = getString("prompt"),
        createdBy = getString("created_by"),
        createdAt = Instant.parse(getString("created_at")),
        finishedAt = getString("finished_at")?.let(Instant::parse),
        visibility = Visibility.valueOf(getString("visibility").uppercase()),
        rematchOf = getString("rematch_of"),
        turnStartedAt = Instant.parse(getString("turn_started_at") ?: getString("created_at")),
    )

    private fun ResultSet.toSeat() = SeatRow(
        drawingId = getString("drawing_id"),
        position = getInt("position"),
        playerId = getString("player_id"),
        playerName = getString("player_name"),
        joinedAt = Instant.parse(getString("joined_at")),
        strokes = getString("strokes"),
        submittedAt = getString("submitted_at")?.let(Instant::parse),
    )
}
