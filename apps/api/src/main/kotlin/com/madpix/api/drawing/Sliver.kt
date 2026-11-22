package com.madpix.api.drawing

/**
 * The part of a strip the next artist is allowed to see: whatever can show in its
 * bottom [Geometry.SLIVER] band. Strokes are cut here, on the server, so the rest of
 * the strip never reaches the next artist's phone. No peeking, even with dev tools.
 *
 * Coordinates are unchanged, so the app draws the result exactly as it would draw
 * the whole strip, clipped to the band.
 */
fun sliverOf(strokes: List<Stroke>, stripH: Int): List<Stroke> {
    val bandTop = stripH * (1 - Geometry.SLIVER)
    return strokes.flatMap { clipToBand(it, bandTop) }
}

/**
 * Splits a stroke into the runs whose ink reaches the band. A run that enters from
 * above starts exactly at the cut line (an interpolated point), not at the hidden
 * point it came from.
 */
internal fun clipToBand(stroke: Stroke, bandTop: Double): List<Stroke> {
    // A point counts if half the pen width reaches into the band.
    val cut = bandTop - stroke.width / 2
    val p = stroke.points
    val n = p.size / 2
    fun x(i: Int) = p[2 * i]
    fun y(i: Int) = p[2 * i + 1]
    fun visible(i: Int) = y(i) >= cut

    /** Where the segment from point a to point b crosses the cut line. Exactly one end is visible. */
    fun crossing(a: Int, b: Int): List<Double> {
        val t = (cut - y(a)) / (y(b) - y(a))
        return listOf(x(a) + t * (x(b) - x(a)), cut)
    }

    val runs = mutableListOf<Stroke>()
    var run: MutableList<Double>? = null
    for (i in 0 until n) {
        if (visible(i)) {
            if (run == null) {
                run = mutableListOf()
                if (i > 0) run += crossing(i - 1, i)
            }
            run += x(i)
            run += y(i)
        } else if (run != null) {
            run += crossing(i - 1, i)
            runs += stroke.copy(points = run)
            run = null
        }
    }
    if (run != null) runs += stroke.copy(points = run)
    return runs
}
