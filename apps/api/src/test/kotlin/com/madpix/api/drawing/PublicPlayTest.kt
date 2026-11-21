package com.madpix.api.drawing

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.http.HttpMethod
import org.springframework.http.HttpMethod.GET
import org.springframework.http.HttpMethod.POST
import org.springframework.http.MediaType
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.request
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.nio.file.Files
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

/**
 * "Play now", public drawings, turn time limits, blocking and rematches. Each test gets its own
 * database, because "Play now" picks from every public drawing there is.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PublicPlayTest(
    @Autowired private val mvc: MockMvc,
    @Autowired private val json: ObjectMapper,
    @Autowired private val clock: FakeClock,
    @Autowired private val service: DrawingService,
) {
    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun db(registry: DynamicPropertyRegistry) {
            val file = Files.createTempFile("madpix-public-test", ".db")
            Files.delete(file)
            registry.add("madpix.db-path") { file.toString() }
            registry.add("madpix.rate-limit.enabled") { "false" }
            // Always join when there's a drawing to join, so the tests know what to expect.
            registry.add("madpix.play-now.create-chance") { "0" }
        }
    }

    @TestConfiguration
    class Config {
        @Bean
        @Primary
        fun fakeClock() = FakeClock()
    }

    class FakeClock(var now: Instant = Instant.parse("2026-11-21T12:00:00Z")) : Clock() {
        override fun getZone(): ZoneId = ZoneOffset.UTC
        override fun withZone(zone: ZoneId?): Clock = this
        override fun instant(): Instant = now
        fun advance(d: Duration) {
            now += d
        }
    }

    private val stroke = mapOf("color" to "#1B1B1B", "width" to 6, "points" to listOf(200, 300, 220, 490))

    @Test
    fun `play now joins a drawing where it's my turn, or starts a public one`() {
        val ann = newPlayer("Ann")
        val ben = newPlayer("Ben")
        val cat = newPlayer("Cat")

        // Nothing to join yet: Ann gets a new public drawing with random settings, and goes first.
        val started = playNow(ann)
        assertEquals("PUBLIC", started["visibility"].asString())
        assertTrue(started["artistCount"].asInt() in 2..4)
        assertTrue(started["myTurn"].asBoolean())
        assertTrue(started["turnEndsAt"].isString, "public turns have a time limit")
        val id = started["id"].asString()

        // Until Ann folds, it's not anyone else's turn, so Ben gets a drawing of his own.
        val bens = playNow(ben)
        assertNotEquals(id, bens["id"].asString())

        // Once Ann folds, Cat joins Ann's drawing (the oldest) and it's her turn at once.
        fold(ann, id)
        val cats = playNow(cat)
        assertEquals(id, cats["id"].asString())
        assertTrue(cats["myTurn"].asBoolean())
        assertEquals(1, cats["myPosition"].asInt())
        assertTrue(cats["sliver"].isArray, "Cat sees the sliver of Ann's strip")
    }

    @Test
    fun `private, reported and blocked drawings are never handed out`() {
        val ann = newPlayer("Ann")
        val ben = newPlayer("Ben")
        val cat = newPlayer("Cat")

        // A private drawing waiting for its second artist stays private.
        val private = create(ann, artists = 2, public = false)
        fold(ann, private)
        assertNotEquals(private, playNow(ben)["id"].asString())

        // A reported public drawing is out too.
        val reported = create(ann, artists = 3, public = true)
        fold(ann, reported)
        call(ann, POST, "/drawings/$reported/report", mapOf("reason" to "oops")).andExpect { status { isNoContent() } }
        assertNotEquals(reported, playNow(cat)["id"].asString())

        // Ben blocks Ann from a drawing they share. After that, Ben never gets Ann's public drawings.
        val shared = create(ann, artists = 3, public = true)
        fold(ann, shared)
        val dan = newPlayer("Dan")
        assertEquals(shared, playNow(dan)["id"].asString())
        call(dan, POST, "/drawings/$shared/block", mapOf("position" to 0)).andExpect { status { isNoContent() } }
        call(dan, POST, "/drawings/$shared/block", mapOf("position" to 1)).andExpect { status { isBadRequest() } }
        val annsNext = create(ann, artists = 2, public = true)
        fold(ann, annsNext)
        assertNotEquals(annsNext, playNow(dan)["id"].asString())
        // Someone who isn't blocked still gets it.
        assertEquals(annsNext, playNow(newPlayer("Eve"))["id"].asString())
    }

    @Test
    fun `a turn that runs past 12 hours opens the spot for someone else`() {
        val ann = newPlayer("Ann")
        val ben = newPlayer("Ben")
        val id = create(ann, artists = 2, public = true)
        fold(ann, id)
        clock.advance(Duration.ofHours(20)) // Ann's long gone; the clock starts when Ben joins.
        assertEquals(id, playNow(ben)["id"].asString())

        clock.advance(Duration.ofHours(11))
        service.expireTurns()
        assertTrue(call(ben, GET, "/drawings/$id").json()["myTurn"].asBoolean(), "still Ben's turn")

        clock.advance(Duration.ofHours(2))
        service.expireTurns()
        call(ben, GET, "/drawings/$id").andExpect { status { isNotFound() } }
        val cat = newPlayer("Cat")
        val cats = playNow(cat)
        assertEquals(id, cats["id"].asString(), "the spot is open again")
        assertTrue(cats["myTurn"].asBoolean())

        // A drawing whose first artist never draws goes away.
        val lonely = create(ben, artists = 2, public = true)
        clock.advance(Duration.ofHours(13))
        service.expireTurns()
        call(ben, GET, "/drawings/$lonely").andExpect { status { isNotFound() } }

        // Private drawings with friends have no time limit.
        val private = create(ann, artists = 2, public = false)
        clock.advance(Duration.ofDays(3))
        service.expireTurns()
        assertTrue(call(ann, GET, "/drawings/$private").json()["turnEndsAt"].isNull)
        call(ann, GET, "/drawings/$private").andExpect { status { isOk() } }
    }

    @Test
    fun `draw again starts one rematch with the same artists, the asker first`() {
        val ann = newPlayer("Ann")
        val ben = newPlayer("Ben")
        val first = call(ann, POST, "/drawings", mapOf("artistCount" to 2, "prompt" to "giraffe")).json()
        val id = first["id"].asString()
        fold(ann, id)
        call(ben, POST, "/drawings/join", mapOf("code" to first["inviteCode"].asString()))
        fold(ben, id)

        // Not before it's finished... (already is) and only for its artists.
        call(newPlayer("Cat"), POST, "/drawings/$id/rematch", mapOf("prompt" to "robot"))
            .andExpect { status { isNotFound() } }

        val again = call(ben, POST, "/drawings/$id/rematch", mapOf("prompt" to "robot")).json()
        val rematch = again["id"].asString()
        assertEquals(id, again["rematchOf"].asString())
        assertEquals("PRIVATE", again["visibility"].asString())
        assertEquals(0, again["myPosition"].asInt(), "Ben asked, so Ben starts")
        assertTrue(again["myTurn"].asBoolean())
        assertEquals("robot", again["prompt"].asString())
        assertTrue(again["inviteCode"].isNull, "everyone's in already")
        assertTrue(again["turnEndsAt"].isString, "rematch turns have a time limit")

        // Ann taps "Draw again" too: she lands in the same rematch, second.
        val annSees = call(ann, POST, "/drawings/$id/rematch", mapOf("prompt" to "cactus")).json()
        assertEquals(rematch, annSees["id"].asString())
        assertEquals(1, annSees["myPosition"].asInt())
        assertFalse(annSees["myTurn"].asBoolean())

        // If Ben doesn't draw in 12 hours, he's out and Ann moves up.
        clock.advance(Duration.ofHours(13))
        service.expireTurns()
        val after = call(ann, GET, "/drawings/$rematch").json()
        assertTrue(after["myTurn"].asBoolean())
        assertTrue(after["inviteCode"].isString, "Ben's old spot can be filled by invite")
    }

    @Test
    fun `names and inspo words are filtered`() {
        call(null, POST, "/players", mapOf("name" to "f u c k")).andExpect { status { isBadRequest() } }
        call(null, POST, "/players", mapOf("name" to "Sh1tty Sam")).andExpect { status { isBadRequest() } }
        newPlayer("Dickens Duck")
        newPlayer("Scunthorpe Seal")
        val ann = newPlayer("Ann")
        call(ann, POST, "/drawings", mapOf("artistCount" to 2, "prompt" to "nazi")).andExpect { status { isBadRequest() } }
        call(ann, HttpMethod.PATCH, "/players/me", mapOf("name" to "slutty")).andExpect { status { isBadRequest() } }
    }

    // --- helpers ---

    private data class TestPlayer(val token: String)

    private fun newPlayer(name: String): TestPlayer {
        val res = call(null, POST, "/players", mapOf("name" to name)).andExpect { status { isCreated() } }.json()
        return TestPlayer(res["token"].asString())
    }

    private fun create(p: TestPlayer, artists: Int, public: Boolean): String =
        call(p, POST, "/drawings", mapOf("artistCount" to artists, "public" to public))
            .andExpect { status { isCreated() } }.json()["id"].asString()

    private fun playNow(p: TestPlayer): JsonNode =
        call(p, POST, "/drawings/play-now", mapOf("prompt" to "snowman")).andExpect { status { isOk() } }.json()

    private fun fold(p: TestPlayer, id: String) {
        call(p, POST, "/drawings/$id/strip", mapOf("strokes" to listOf(stroke))).andExpect { status { isOk() } }
    }

    private fun call(player: TestPlayer?, method: HttpMethod, path: String, body: Any? = null): ResultActionsDsl =
        mvc.request(method, path) {
            player?.let { header("Authorization", "Bearer ${it.token}") }
            body?.let {
                contentType = MediaType.APPLICATION_JSON
                content = json.writeValueAsString(it)
            }
        }

    private fun ResultActionsDsl.json(): JsonNode = json.readTree(andReturn().response.contentAsString)
}
