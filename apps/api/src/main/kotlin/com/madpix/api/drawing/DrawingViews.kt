package com.madpix.api.drawing

import java.time.Instant

data class ArtistView(
    val position: Int,
    /** Null until someone takes this spot. */
    val name: String?,
    val joined: Boolean,
    /** Has folded their strip. */
    val done: Boolean,
    val isMe: Boolean,
)

/** A drawing as one player sees it. Only ever holds what that player is allowed to see. */
data class DrawingView(
    val id: String,
    /** Public drawings can be joined by anyone through "Play now". */
    val visibility: Visibility,
    /** Null once every spot is taken. */
    val inviteCode: String?,
    val artistCount: Int,
    val stripH: Int,
    val prompt: String?,
    val status: Status,
    /** How many strips are folded; also the position of the artist whose turn it is. */
    val turn: Int,
    val artists: List<ArtistView>,
    val myPosition: Int,
    val myTurn: Boolean,
    /** The next spot is empty, so the drawing waits until someone joins with the invite code. */
    val waitingForArtist: Boolean,
    /** Only on your turn: the bottom edge of the strip above yours, already cut on the server. */
    val sliver: List<Stroke>?,
    /** Only once finished: every strip, top to bottom. */
    val strips: List<List<Stroke>>?,
    /** Public drawings and rematches: when the current artist loses their spot if they haven't folded. */
    val turnEndsAt: Instant?,
    /** Set on a rematch: the drawing it came from. */
    val rematchOf: String?,
    val createdAt: Instant,
    val finishedAt: Instant?,
) {
    enum class Status { DRAWING, FINISHED }
}

/** What someone sees from an invite code before joining. */
data class InviteView(
    val inviteCode: String,
    val artistCount: Int,
    val artists: List<String>,
    val spotsLeft: Int,
    val finished: Boolean,
)
