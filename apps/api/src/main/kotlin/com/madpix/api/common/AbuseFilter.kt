package com.madpix.api.common

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.time.Clock

/**
 * The first thing every request meets: turns away bodies that are too big (or of unknown size)
 * and clients sending too many requests, before any JSON is read or any SQL runs.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class AbuseFilter(
    clock: Clock,
    @Value("\${madpix.rate-limit.enabled:true}") private val rateLimitEnabled: Boolean,
) : OncePerRequestFilter() {

    private val limiter = RateLimiter(clock)

    override fun shouldNotFilter(request: HttpServletRequest) =
        request.method == "OPTIONS" || request.requestURI == "/healthz"

    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        if (req.contentLengthLong > MAX_BODY_BYTES) {
            return reject(res, 413, "That drawing is too big to send. Try fewer strokes.")
        }
        // Without a length we can't cap the body up front. The app always sends one.
        if (req.getHeader("Transfer-Encoding")?.contains("chunked", ignoreCase = true) == true) {
            return reject(res, 411, "Send a Content-Length")
        }
        if (rateLimitEnabled) {
            val client = clientIp(req)
            val limit = Limit.of(req.method, req.requestURI)
            if (!limiter.allow(client, limit)) {
                res.setHeader("Retry-After", limiter.retryAfterSeconds(client, limit).toString())
                return reject(res, 429, "Slow down a little! Try again in a minute.")
            }
        }
        chain.doFilter(req, res)
    }

    /** Fly's proxy puts the caller's address in Fly-Client-IP; locally it's the socket's. */
    private fun clientIp(req: HttpServletRequest): String = req.getHeader("Fly-Client-IP") ?: req.remoteAddr

    private fun reject(res: HttpServletResponse, status: Int, detail: String) {
        res.status = status
        res.contentType = "application/problem+json"
        // These skip Spring's CORS handling; without this the web app would only see a CORS error.
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.writer.write("""{"status":$status,"detail":"$detail"}""")
    }

    private companion object {
        /** A strip at the stroke limit, with points to one decimal place, is about 3 MB of JSON. */
        const val MAX_BODY_BYTES = 5L * 1024 * 1024
    }
}
