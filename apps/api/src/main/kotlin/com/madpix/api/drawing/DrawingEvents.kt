package com.madpix.api.drawing

/** Published inside the transaction; notifications go out only after it commits. */
/** [previousArtist] is null when nobody has folded yet (the first artist left, so it's your turn to start). */
data class TurnStarted(val drawingId: String, val playerId: String, val previousArtist: String?)

data class DrawingFinished(val drawingId: String, val playerIds: List<String>, val lastArtistId: String)
