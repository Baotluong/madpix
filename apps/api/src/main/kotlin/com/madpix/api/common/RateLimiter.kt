package com.madpix.api.common

import java.time.Clock
import java.util.concurrent.ConcurrentHashMap

/**
 * How many requests one client may make in a window, by kind of request. Generous enough for a
 * family behind one Wi-Fi, tight enough that a script can't guess invite codes or fill the disk.
 */
enum class Limit(val requests: Int, val windowMs: Long) {
    /** Creating players: each one is a row on disk. */
    SIGNUP(20, HOUR),

    /** Looking up and joining by code: the only way to find a private drawing. */
    INVITE(30, MINUTE),

    /** Creating drawings, folding strips, renaming, reporting. */
    WRITE(60, MINUTE),

    /** Everything else, mostly the app polling a drawing every few seconds. */
    READ(300, MINUTE),
    ;

    companion object {
        fun of(method: String, path: String): Limit = when {
            method == "POST" && path == "/players" -> SIGNUP
            path.startsWith("/invites/") || path == "/drawings/join" -> INVITE
            method == "GET" -> READ
            else -> WRITE
        }
    }
}

private const val MINUTE = 60_000L
private const val HOUR = 60 * MINUTE

/**
 * Fixed-window counters per client and [Limit], kept in memory. That's enough with one machine;
 * a restart just forgets the counts.
 */
class RateLimiter(private val clock: Clock) {
    private class Window(val start: Long, var count: Int)

    private val windows = ConcurrentHashMap<String, Window>()

    @Volatile
    private var lastSweep = 0L

    /** Counts this request and says whether it's within the limit. */
    fun allow(client: String, limit: Limit): Boolean {
        val now = clock.millis()
        // Forget addresses we haven't seen for an hour (the privacy policy promises this).
        if (now - lastSweep > SWEEP_EVERY_MS || windows.size > MAX_KEYS) {
            lastSweep = now
            windows.values.removeIf { now - it.start >= HOUR }
        }
        val window = windows.compute("${limit.name}:$client") { _, w ->
            if (w == null || now - w.start >= limit.windowMs) Window(now, 1) else w.apply { count++ }
        }!!
        return window.count <= limit.requests
    }

    /** Seconds until the client's current window for [limit] resets. */
    fun retryAfterSeconds(client: String, limit: Limit): Long {
        val start = windows["${limit.name}:$client"]?.start ?: return 1
        return ((start + limit.windowMs - clock.millis()) / 1000).coerceAtLeast(1)
    }

    private companion object {
        const val MAX_KEYS = 50_000
        const val SWEEP_EVERY_MS = 10 * MINUTE
    }
}
