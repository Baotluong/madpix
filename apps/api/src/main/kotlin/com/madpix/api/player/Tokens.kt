package com.madpix.api.player

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

/**
 * Anonymous auth. A new player gets a random token that lives only on their device;
 * the database keeps its SHA-256, so a leaked database can't be used to sign in.
 */
object Tokens {
    private val random = SecureRandom()

    fun newToken(): String {
        val bytes = ByteArray(32).also(random::nextBytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun hash(token: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(token.toByteArray())
            .joinToString("") { "%02x".format(it) }
}
