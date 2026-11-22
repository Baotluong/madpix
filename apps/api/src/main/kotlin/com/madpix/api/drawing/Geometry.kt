package com.madpix.api.drawing

/** Same numbers as the app's src/game/geometry.ts. Strokes are in strip units, not pixels. */
object Geometry {
    const val STRIP_W = 1000
    const val STRIP_H = 500

    /** The share of the previous strip (its bottom edge) the next artist sees. */
    const val SLIVER = 0.1

    const val MIN_ARTISTS = 2
    const val MAX_ARTISTS = 4
}
