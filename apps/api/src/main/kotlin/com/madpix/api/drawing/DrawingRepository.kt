package com.madpix.api.drawing

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant

data class DrawingRow(
    val id: String,
    val inviteCode: String,
    val artistCount: Int,
    val stripH: Int,
    val prompt: String?,
    val createdBy: String,
    val createdAt: Instant,
    val finishedAt: Instant?,
)

data class SeatRow(
    val drawingId: String,
    val position: Int,
    val playerId: String,
    val playerName: String,
    /** JSON list of strokes, once the artist has folded their strip. */
    val strokes: String?,
    val submittedAt: Instant?,
)

@Repository
class DrawingRepository(private val jdbc: JdbcClient) {

    fun insert(d: DrawingRow) {
        jdbc.sql(
            """
            INSERT INTO drawings (id, invite_code, artist_count, strip_h, prompt, created_by, created_at)
            VALUES (:id, :code, :artists, :stripH, :prompt, :createdBy, :createdAt)
            """,
        )
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

    /** The player's drawings, most recently active first. */
    fun findForPlayer(playerId: String, limit: Int): List<DrawingRow> =
        jdbc.sql(
            """
            SELECT d.* FROM drawings d
            JOIN seats s ON s.drawing_id = d.id
            WHERE s.player_id = ?
            ORDER BY COALESCE(d.finished_at, d.created_at) DESC
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
    )

    private fun ResultSet.toSeat() = SeatRow(
        drawingId = getString("drawing_id"),
        position = getInt("position"),
        playerId = getString("player_id"),
        playerName = getString("player_name"),
        strokes = getString("strokes"),
        submittedAt = getString("submitted_at")?.let(Instant::parse),
    )
}
