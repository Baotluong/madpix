package com.madpix.api.drawing

import com.madpix.api.push.PushMessage
import com.madpix.api.push.PushSender
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.http.HttpMethod
import org.springframework.http.HttpMethod.DELETE
import org.springframework.http.HttpMethod.GET
import org.springframework.http.HttpMethod.PATCH
import org.springframework.http.HttpMethod.POST
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.request
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.nio.file.Files
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Whole remote drawings, through the HTTP API, against a throwaway SQLite file. */
@SpringBootTest
@AutoConfigureMockMvc
class DrawingFlowTest(
    @Autowired private val mvc: MockMvc,
    @Autowired private val json: ObjectMapper,
    @Autowired private val pushes: RecordingPushSender,
) {
    companion object {
        const val ADMIN = "test-admin-token"

        @JvmStatic
        @DynamicPropertySource
        fun db(registry: DynamicPropertyRegistry) {
            val file = Files.createTempFile("madpix-test", ".db")
            Files.delete(file)
            registry.add("madpix.db-path") { file.toString() }
            // These tests make lots of players from one address; AbuseFilterTest covers the limits.
            registry.add("madpix.rate-limit.enabled") { "false" }
            registry.add("madpix.admin-token") { ADMIN }
        }
    }

    @TestConfiguration
    class Config {
        @Bean
        @Primary
        fun recordingPushSender() = RecordingPushSender()
    }

    class RecordingPushSender : PushSender {
        val sent = CopyOnWriteArrayList<PushMessage>()
        override fun send(messages: List<PushMessage>) {
            sent += messages
        }
    }

    @Test
    fun `two artists draw a page, and the second only ever sees the sliver`() {
        pushes.sent.clear()
        val bao = newPlayer("Bao", push = "ExponentPushToken[bao]")
        val sam = newPlayer("Sam", push = "ExponentPushToken[sam]")

        // Bao starts and can draw right away, before anyone joins.
        val created = call(bao, POST, "/drawings", mapOf("artistCount" to 2, "prompt" to "Elephant"))
            .andExpect { status { isCreated() } }.json()
        val id = created["id"].asString()
        val code = created["inviteCode"].asString()
        assertTrue(Regex("^[a-z]+[0-9]{1,2}$").matches(code), "easy to type: $code")
        assertTrue(created["myTurn"].asBoolean())
        assertEquals("elephant", created["prompt"].asString())

        // Bao folds a strip: one stroke high up (secret) and one reaching into the bottom band.
        val secret = mapOf("color" to "#E53935", "width" to 6, "points" to listOf(100, 50, 900, 60))
        val edge = mapOf("color" to "#1B1B1B", "width" to 6, "points" to listOf(200, 300, 220, 490))
        val afterBao = call(bao, POST, "/drawings/$id/strip", mapOf("strokes" to listOf(secret, edge)))
            .andExpect { status { isOk() } }.json()
        assertFalse(afterBao["myTurn"].asBoolean())
        assertTrue(afterBao["waitingForArtist"].asBoolean(), "nobody has spot 2 yet")
        assertEquals(2, afterBao["myStrip"].size(), "Bao can look at his own strip again")

        // Sam previews the invite (codes ignore case and spaces), then joins: it's their turn.
        val typed = code.uppercase().replace(Regex("([0-9]+)"), " $1")
        call(null, GET, "/invites/$typed")
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.spotsLeft") { value(1) } }
        val joined = call(sam, POST, "/drawings/join", mapOf("code" to typed))
            .andExpect { status { isOk() } }.json()
        assertTrue(joined["myTurn"].asBoolean())
        assertEquals(1, joined["myPosition"].asInt())
        assertTrue(joined["strips"].isNull, "no strips until the end")
        assertTrue(joined["myStrip"].isNull, "Sam hasn't drawn, and never sees Bao's strip")

        // Sam's sliver holds only the bottom of the edge stroke, cut at the band.
        val sliver = joined["sliver"]
        assertEquals(1, sliver.size())
        assertEquals("#1B1B1B", sliver[0]["color"].asString())
        val points = sliver[0]["points"]
        val ys = (1 until points.size() step 2).map { points[it].asDouble() }
        assertTrue(ys.all { it >= 447.0 }, "sliver points are all in the band: $ys")

        // Bao can't go again; Sam folds the last strip and the page is finished.
        call(bao, POST, "/drawings/$id/strip", mapOf("strokes" to emptyList<Any>()))
            .andExpect { status { isConflict() } }
        val done = call(sam, POST, "/drawings/$id/strip", mapOf("strokes" to listOf(edge)))
            .andExpect { status { isOk() } }.json()
        assertEquals("FINISHED", done["status"].asString())
        assertEquals(2, done["strips"].size())

        // Bao gets the "it's done" push; Sam doesn't (they just finished it).
        awaitPushes(1)
        assertEquals(listOf("ExponentPushToken[bao]"), pushes.sent.map { it.to })
        assertEquals(id, pushes.sent.single().data["drawingId"])
    }

    @Test
    fun `the next artist is notified when the artist before them folds`() {
        val a = newPlayer("A", push = "ExponentPushToken[a]")
        val b = newPlayer("B", push = "ExponentPushToken[b]")
        val c = newPlayer("C")
        val d = call(a, POST, "/drawings", mapOf("artistCount" to 3)).json()
        val id = d["id"].asString()
        call(b, POST, "/drawings/join", mapOf("code" to d["inviteCode"].asString()))
        call(c, POST, "/drawings/join", mapOf("code" to d["inviteCode"].asString()))
        pushes.sent.clear()

        call(a, POST, "/drawings/$id/strip", mapOf("strokes" to emptyList<Any>()))
            .andExpect { status { isOk() } }
        awaitPushes(1)
        assertEquals("ExponentPushToken[b]", pushes.sent.single().to)
        assertEquals("Your turn to draw", pushes.sent.single().title)
    }

    @Test
    fun `full drawings, strangers and bad strokes are turned away`() {
        val a = newPlayer("A")
        val b = newPlayer("B")
        val c = newPlayer("C")
        val stranger = newPlayer("Stranger")
        val d = call(a, POST, "/drawings", mapOf("artistCount" to 3)).json()
        val id = d["id"].asString()
        val code = d["inviteCode"].asString()

        call(b, POST, "/drawings/join", mapOf("code" to code)).andExpect { status { isOk() } }
        // Joining twice is harmless.
        call(b, POST, "/drawings/join", mapOf("code" to code)).andExpect { status { isOk() } }
        // The last spot is taken, so the code is freed for another drawing.
        val full = call(c, POST, "/drawings/join", mapOf("code" to code)).andExpect { status { isOk() } }.json()
        assertTrue(full["inviteCode"].isNull)
        call(stranger, POST, "/drawings/join", mapOf("code" to code)).andExpect { status { isNotFound() } }
        call(stranger, GET, "/drawings/$id").andExpect { status { isNotFound() } }
        call(null, GET, "/drawings/$id").andExpect { status { isUnauthorized() } }

        val badColor = mapOf("color" to "red", "width" to 6, "points" to listOf(1, 1))
        call(a, POST, "/drawings/$id/strip", mapOf("strokes" to listOf(badColor)))
            .andExpect { status { isBadRequest() } }
        call(a, POST, "/drawings", mapOf("artistCount" to 9)).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `deleting my data gives up my open spots, keeps my folded strips, and logs me out`() {
        val a = newPlayer("A", push = "ExponentPushToken[a]")
        val b = newPlayer("B")
        val c = newPlayer("C", push = "ExponentPushToken[c]")

        // B is alone in one drawing...
        val solo = call(b, POST, "/drawings", mapOf("artistCount" to 2)).json()
        // ...is next up in a full one (A folded, B's turn, then C)...
        val d = call(a, POST, "/drawings", mapOf("artistCount" to 3)).json()
        val id = d["id"].asString()
        call(b, POST, "/drawings/join", mapOf("code" to d["inviteCode"].asString()))
        call(c, POST, "/drawings/join", mapOf("code" to d["inviteCode"].asString()))
        call(a, POST, "/drawings/$id/strip", mapOf("strokes" to emptyList<Any>()))
        // ...and has already folded their strip in a finished one with A.
        val done = call(b, POST, "/drawings", mapOf("artistCount" to 2)).json()
        val doneId = done["id"].asString()
        call(b, POST, "/drawings/$doneId/strip", mapOf("strokes" to emptyList<Any>()))
        call(a, POST, "/drawings/join", mapOf("code" to done["inviteCode"].asString()))
        call(a, POST, "/drawings/$doneId/strip", mapOf("strokes" to emptyList<Any>()))
        pushes.sent.clear()

        call(b, DELETE, "/players/me").andExpect { status { isNoContent() } }

        // B's token is dead, and the drawing only B was in is gone.
        call(b, GET, "/players/me").andExpect { status { isUnauthorized() } }
        call(null, GET, "/invites/${solo["inviteCode"].asString()}").andExpect { status { isNotFound() } }

        // C moved up into B's spot, so it's C's turn now, and C hears about it.
        val forC = call(c, GET, "/drawings/$id").json()
        assertTrue(forC["myTurn"].asBoolean())
        assertEquals(1, forC["myPosition"].asInt())
        val names = forC["artists"].let { arr -> (0 until arr.size()).map { arr[it]["name"] } }
        assertEquals(listOf("A", "C", null), names.map { if (it.isNull) null else it.asString() })
        assertFalse(forC["inviteCode"].isNull, "a spot opened up, so the drawing has a code again")
        awaitPushes(1)
        assertEquals("ExponentPushToken[c]", pushes.sent.single().to)
        assertEquals("A folded their strip. Pick up where they left off!", pushes.sent.single().body)

        // The finished drawing keeps B's strip, now by "Deleted artist".
        val forA = call(a, GET, "/drawings/$doneId").json()
        assertEquals("Deleted artist", forA["artists"][0]["name"].asString())
        assertEquals(2, forA["strips"].size())
    }

    @Test
    fun `artists can report a drawing, strangers can't`() {
        val a = newPlayer("A")
        val stranger = newPlayer("Stranger")
        val id = call(a, POST, "/drawings", mapOf("artistCount" to 2)).json()["id"].asString()

        call(a, POST, "/drawings/$id/report", mapOf("reason" to "rude words")).andExpect { status { isNoContent() } }
        call(a, POST, "/drawings/$id/report").andExpect { status { isNoContent() } }
        call(stranger, POST, "/drawings/$id/report").andExpect { status { isNotFound() } }
    }

    @Test
    fun `one player can only be in so many unfinished drawings`() {
        val busy = newPlayer("Busy")
        repeat(20) {
            call(busy, POST, "/drawings", mapOf("artistCount" to 2)).andExpect { status { isCreated() } }
        }
        call(busy, POST, "/drawings", mapOf("artistCount" to 2)).andExpect { status { isConflict() } }
        val other = call(newPlayer("Other"), POST, "/drawings", mapOf("artistCount" to 2)).json()
        call(busy, POST, "/drawings/join", mapOf("code" to other["inviteCode"].asString()))
            .andExpect { status { isConflict() } }
    }

    @Test
    fun `an admin can review a report, then delete the drawing or remove the player`() {
        val a = newPlayer("A")
        val troll = newPlayer("Troll")
        val d = call(troll, POST, "/drawings", mapOf("artistCount" to 2)).json()
        val id = d["id"].asString()
        val rude = mapOf("color" to "#E53935", "width" to 6, "points" to listOf(10, 10, 990, 490))
        call(troll, POST, "/drawings/$id/strip", mapOf("strokes" to listOf(rude)))
        call(a, POST, "/drawings/join", mapOf("code" to d["inviteCode"].asString()))
        call(a, POST, "/drawings/$id/report", mapOf("reason" to "rude"))

        // Without the right token, the admin routes look like they don't exist.
        mvc.request(GET, "/admin/reports").andExpect { status { isNotFound() } }
        admin(GET, "/admin/reports", token = "wrong").andExpect { status { isNotFound() } }

        val reports = admin(GET, "/admin/reports").andExpect { status { isOk() } }.json()
        val report = (0 until reports.size()).map { reports[it] }.first { it["drawingId"].asString() == id }
        assertEquals("rude", report["reason"].asString())
        val trollId = report["artists"][0]["playerId"].asString()
        assertEquals("Troll", report["artists"][0]["name"].asString())

        val svg = admin(GET, "/admin/drawings/$id/svg").andExpect { status { isOk() } }
            .andReturn().response.contentAsString
        assertTrue(svg.startsWith("<svg") && "polyline" in svg && "1. Troll" in svg, svg)

        // Removing the troll blanks their strip and wipes their name and login.
        admin(POST, "/admin/players/$trollId/remove").andExpect { status { isNoContent() } }
        call(troll, GET, "/players/me").andExpect { status { isUnauthorized() } }
        val after = admin(GET, "/admin/drawings/$id/svg").andReturn().response.contentAsString
        assertFalse("polyline" in after, "the troll's strip is blank")
        assertTrue("Deleted artist" in after)

        // Deleting the drawing takes it away for everyone.
        admin(DELETE, "/admin/drawings/$id").andExpect { status { isNoContent() } }
        call(a, GET, "/drawings/$id").andExpect { status { isNotFound() } }
    }

    // --- helpers ---

    private fun admin(method: HttpMethod, path: String, token: String = ADMIN) =
        mvc.request(method, path) { header("Authorization", "Bearer $token") }


    private data class TestPlayer(val token: String)

    private fun newPlayer(name: String, push: String? = null): TestPlayer {
        val res = call(null, POST, "/players", mapOf("name" to name)).andExpect { status { isCreated() } }.json()
        val p = TestPlayer(res["token"].asString())
        if (push != null) call(p, PATCH, "/players/me", mapOf("pushToken" to push)).andExpect { status { isOk() } }
        return p
    }

    /** A request as [player] (or signed out when null), with an optional JSON body. */
    private fun call(player: TestPlayer?, method: HttpMethod, path: String, body: Any? = null): ResultActionsDsl =
        mvc.request(method, path) {
            player?.let { header("Authorization", "Bearer ${it.token}") }
            body?.let {
                contentType = MediaType.APPLICATION_JSON
                content = json.writeValueAsString(it)
            }
        }

    private fun ResultActionsDsl.json(): JsonNode = json.readTree(andReturn().response.contentAsString)

    private fun awaitPushes(count: Int) {
        val deadline = System.currentTimeMillis() + 3_000
        while (pushes.sent.size < count && System.currentTimeMillis() < deadline) Thread.sleep(20)
        Thread.sleep(100) // and make sure no extra ones arrive
        assertEquals(count, pushes.sent.size, "pushes: ${pushes.sent}")
    }
}
