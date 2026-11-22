package com.madpix.api.admin

import com.madpix.api.common.notFound
import com.madpix.api.drawing.DrawingRepository
import com.madpix.api.drawing.DrawingService
import com.madpix.api.drawing.Stroke
import com.madpix.api.player.PlayerRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import tools.jackson.databind.ObjectMapper
import tools.jackson.module.kotlin.readValue
import java.security.MessageDigest
import java.time.Clock
import java.time.Instant

/**
 * For acting on reports: list them, look at a drawing, delete it, or remove a player. Needs the
 * ADMIN_TOKEN secret. Without it set, these routes don't exist (404), and a wrong token gets 404
 * too, so nobody can tell they're here. See admin.sh.
 */
@RestController
@RequestMapping("/admin")
class AdminController(
    @Value("\${madpix.admin-token:}") private val adminToken: String,
    private val drawings: DrawingRepository,
    private val service: DrawingService,
    private val players: PlayerRepository,
    private val json: ObjectMapper,
    private val clock: Clock,
) {
    data class ArtistInfo(val position: Int, val name: String, val playerId: String, val drew: Boolean)

    data class ReportInfo(
        val drawingId: String,
        val reason: String?,
        val reportedAt: Instant,
        val reportedBy: String,
        val finished: Boolean?,
        val artists: List<ArtistInfo>,
    )

    @GetMapping("/reports")
    fun reports(@RequestHeader("Authorization", required = false) auth: String?): List<ReportInfo> {
        requireAdmin(auth)
        val reports = drawings.recentReports(limit = 100)
        val seats = drawings.seats(reports.map { it.drawingId }.toSet()).groupBy { it.drawingId }
        return reports.map { r ->
            ReportInfo(
                drawingId = r.drawingId,
                reason = r.reason,
                reportedAt = r.createdAt,
                reportedBy = r.reporterId,
                finished = drawings.find(r.drawingId)?.let { it.finishedAt != null },
                artists = seats[r.drawingId].orEmpty().map {
                    ArtistInfo(it.position, it.playerName, it.playerId, it.submittedAt != null)
                },
            )
        }
    }

    /** The whole page as an SVG, every strip unfolded, with each artist's name. */
    @GetMapping("/drawings/{id}/svg", produces = ["image/svg+xml"])
    fun svg(@RequestHeader("Authorization", required = false) auth: String?, @PathVariable id: String): String {
        requireAdmin(auth)
        val d = drawings.find(id) ?: notFound("No such drawing")
        val seats = drawings.seats(id)
        val w = 1000
        val h = d.stripH * d.artistCount
        val body = StringBuilder()
        for (pos in 0 until d.artistCount) {
            val top = pos * d.stripH
            val seat = seats.find { it.position == pos }
            val shade = if (pos % 2 == 0) "#fff" else "#fafafa"
            body.append("""<rect x="0" y="$top" width="$w" height="${d.stripH}" fill="$shade"/>""")
            val strokes: List<Stroke> = seat?.strokes?.let { json.readValue(it) } ?: emptyList()
            for (s in strokes) {
                val pts = s.points.chunked(2).joinToString(" ") { (x, y) -> "$x,${y + top}" }
                body.append(
                    """<polyline points="$pts" fill="none" stroke="${s.color}" stroke-width="${s.width}" """ +
                        """stroke-linecap="round" stroke-linejoin="round"/>""",
                )
            }
            val label = seat?.let { "${pos + 1}. ${it.playerName}" } ?: "${pos + 1}. (open)"
            body.append(
                """<text x="8" y="${top + 22}" font-family="sans-serif" font-size="18" fill="#888">""" +
                    "${xml(label)}</text>",
            )
        }
        return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 $w $h" width="$w" height="$h">$body</svg>"""
    }

    @DeleteMapping("/drawings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteDrawing(@RequestHeader("Authorization", required = false) auth: String?, @PathVariable id: String) {
        requireAdmin(auth)
        drawings.find(id) ?: notFound("No such drawing")
        drawings.delete(id)
        log.warn("Admin deleted drawing {}", id)
    }

    /**
     * Removes a player who broke the rules: they leave unfinished drawings, every strip they drew is
     * blanked, and their name and login are wiped (like "Delete my data"). They could start over as a
     * new anonymous player; the rate limits keep that slow.
     */
    @PostMapping("/players/{id}/remove")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    fun removePlayer(@RequestHeader("Authorization", required = false) auth: String?, @PathVariable id: String) {
        requireAdmin(auth)
        val player = players.findById(id) ?: notFound("No such player")
        service.leaveUnfinished(player)
        drawings.blankStrokesBy(id)
        players.anonymize(id, clock.instant())
        log.warn("Admin removed player {}", id)
    }

    private fun requireAdmin(auth: String?) {
        val given = auth?.removePrefix("Bearer ")?.trim().orEmpty()
        val ok = adminToken.isNotBlank() &&
            MessageDigest.isEqual(given.toByteArray(), adminToken.toByteArray())
        if (!ok) notFound("Not found")
    }

    private fun xml(s: String) =
        s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")

    private companion object {
        val log = LoggerFactory.getLogger(AdminController::class.java)
    }
}
