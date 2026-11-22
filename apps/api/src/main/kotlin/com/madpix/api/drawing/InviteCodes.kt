package com.madpix.api.drawing

import java.security.SecureRandom

/**
 * Invite codes people can read out and type on a phone: an easy animal plus a number,
 * like "goose14". About 7,000 combinations, plenty because a code is only held while
 * its drawing has open spots.
 */
object InviteCodes {
    private val words = listOf(
        "ant", "bat", "bear", "bee", "bird", "bison", "bug", "camel", "cat", "cow", "crab", "crow",
        "deer", "dodo", "dog", "duck", "eel", "elk", "emu", "finch", "fish", "fox", "frog", "gecko",
        "goat", "goose", "gull", "hare", "hawk", "hen", "heron", "hippo", "horse", "jay", "kiwi",
        "koala", "lamb", "lemur", "lion", "llama", "mole", "moose", "moth", "mouse", "mule", "newt",
        "otter", "owl", "panda", "pig", "pony", "puma", "pup", "rat", "robin", "seal", "shark",
        "sheep", "sloth", "slug", "snail", "snake", "squid", "swan", "tiger", "toad", "trout", "tuna",
        "whale", "wolf", "worm", "yak", "zebra",
    )
    private val random = SecureRandom()

    fun random(): String = words[random.nextInt(words.size)] + (1 + random.nextInt(99))

    /** "Goose 14", " GOOSE-14 " and "goose14" are all the same code. */
    fun normalize(code: String): String = code.lowercase().filter { it.isLetterOrDigit() }
}
