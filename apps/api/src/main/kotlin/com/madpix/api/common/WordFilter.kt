package com.madpix.api.common

/**
 * Keeps slurs and obvious sexual or profane words out of names and inspo words, which strangers
 * see in public drawings. It's a speed bump, not a guarantee: reports and the admin tools handle
 * what gets through.
 *
 * Text is lowercased and common look-alikes are undone (0 → o, 1 → i, $ → s, ...). Then:
 * - [ANYWHERE] words are caught even inside other words or split by spaces ("f u c k");
 * - [WORDS] must be a whole word, or start one when listed in [STEMS], so "Dickens" and
 *   "Scunthorpe" stay fine.
 */
object WordFilter {
    private val ANYWHERE = listOf("nigger", "nigga", "faggot", "fuck", "retard", "hitler", "porn")

    private val WORDS = setOf(
        "anal", "bitch", "boob", "boobs", "chink", "cock", "cum", "cunt", "dick", "dildo", "fag", "horny",
        "jizz", "kike", "kkk", "nazi", "nude", "nudes", "penis", "pussy", "rape", "rapist", "sex", "sexy",
        "shit", "slut", "spic", "tits", "tranny", "vagina", "whore",
    )

    /** Words that are also caught at the start of a longer word ("bitches", "shitty"). */
    private val STEMS = setOf("bitch", "cunt", "dildo", "shit", "slut", "whore", "rape")

    private val LOOKALIKES = mapOf(
        '0' to 'o', '1' to 'i', '!' to 'i', '|' to 'i', '3' to 'e', '4' to 'a', '@' to 'a',
        '5' to 's', '$' to 's', '7' to 't', '8' to 'b', '9' to 'g',
    )

    fun allowed(text: String): Boolean {
        val plain = text.lowercase().map { LOOKALIKES[it] ?: it }.joinToString("")
        val squashed = plain.filter { it in 'a'..'z' }
        if (ANYWHERE.any { it in squashed }) return false
        val words = plain.split(Regex("[^a-z]+")).filter { it.isNotEmpty() }
        return words.none { w -> w in WORDS || STEMS.any { w.startsWith(it) } }
    }
}
