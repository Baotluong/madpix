package com.madpix.api.common

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.nio.file.Files
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** The filter in front of everything, through real HTTP handling. */
@SpringBootTest
@AutoConfigureMockMvc
class AbuseFilterTest(@Autowired private val mvc: MockMvc) {
    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun db(registry: DynamicPropertyRegistry) {
            val file = Files.createTempFile("madpix-abuse", ".db")
            Files.delete(file)
            registry.add("madpix.db-path") { file.toString() }
        }
    }

    @Test
    fun `a script making players gets slowed down, per address`() {
        repeat(Limit.SIGNUP.requests) {
            signUp("10.0.0.1").andExpect { status { isCreated() } }
        }
        signUp("10.0.0.1").andExpect {
            status { isTooManyRequests() }
            header { exists("Retry-After") }
            jsonPath("$.detail") { exists() }
        }
        // Someone else isn't affected.
        signUp("10.0.0.2").andExpect { status { isCreated() } }
    }

    @Test
    fun `huge bodies are turned away before they're read`() {
        mvc.post("/drawings/x/strip") {
            contentType = MediaType.APPLICATION_JSON
            content = "{\"strokes\":[" + "1,".repeat(3_000_000) + "1]}"
        }.andExpect { status { isPayloadTooLarge() } }
    }

    @Test
    fun `the health check is never limited`() {
        repeat(Limit.READ.requests + 5) {
            mvc.get("/healthz") { header("Fly-Client-IP", "10.0.0.9") }.andExpect { status { isOk() } }
        }
    }

    private fun signUp(ip: String) = mvc.post("/players") {
        header("Fly-Client-IP", ip)
        contentType = MediaType.APPLICATION_JSON
        content = """{"name":"Bot"}"""
    }
}

class RateLimiterTest {
    private class FakeClock(var now: Long) : Clock() {
        override fun getZone() = ZoneOffset.UTC
        override fun withZone(zone: java.time.ZoneId?) = this
        override fun instant(): Instant = Instant.ofEpochMilli(now)
    }

    @Test
    fun `allows up to the limit in a window, then resets`() {
        val clock = FakeClock(0)
        val limiter = RateLimiter(clock)
        repeat(Limit.INVITE.requests) { assertTrue(limiter.allow("ip", Limit.INVITE)) }
        assertFalse(limiter.allow("ip", Limit.INVITE))
        assertTrue(limiter.allow("other-ip", Limit.INVITE))
        assertTrue(limiter.allow("ip", Limit.WRITE), "each kind of request has its own count")

        clock.now += Limit.INVITE.windowMs
        assertTrue(limiter.allow("ip", Limit.INVITE))
    }

    @Test
    fun `requests are grouped by what they do`() {
        assertEquals(Limit.SIGNUP, Limit.of("POST", "/players"))
        assertEquals(Limit.INVITE, Limit.of("GET", "/invites/goose14"))
        assertEquals(Limit.INVITE, Limit.of("POST", "/drawings/join"))
        assertEquals(Limit.READ, Limit.of("GET", "/drawings/abc"))
        assertEquals(Limit.WRITE, Limit.of("POST", "/drawings/abc/strip"))
        assertEquals(Limit.WRITE, Limit.of("DELETE", "/players/me"))
    }
}
