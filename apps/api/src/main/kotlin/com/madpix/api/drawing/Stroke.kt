package com.madpix.api.drawing

import com.madpix.api.common.badRequest

/** One pen stroke. `points` is flat: x0, y0, x1, y1, ... in strip units. */
data class Stroke(
    val color: String,
    val width: Double,
    val points: List<Double>,
)

private val COLOR = Regex("^#[0-9a-fA-F]{6}$")
private const val MAX_STROKES = 3_000
private const val MAX_NUMBERS_PER_STROKE = 10_000
private const val MAX_NUMBERS = 400_000

/** Strokes may start a little outside the strip (on the sliver above it), so allow some slack. */
private const val SLACK = 100.0

fun validateStrokes(strokes: List<Stroke>, stripH: Int) {
    if (strokes.size > MAX_STROKES) badRequest("Too many strokes (max $MAX_STROKES)")
    if (strokes.sumOf { it.points.size } > MAX_NUMBERS) badRequest("Drawing is too detailed")
    for (s in strokes) {
        if (!COLOR.matches(s.color)) badRequest("Bad stroke color: ${s.color.take(20)}")
        if (s.width !in 1.0..200.0) badRequest("Bad stroke width: ${s.width}")
        val n = s.points.size
        if (n == 0 || n % 2 != 0 || n > MAX_NUMBERS_PER_STROKE) badRequest("Bad stroke points")
        for (i in 0 until n step 2) {
            val x = s.points[i]
            val y = s.points[i + 1]
            if (!x.isFinite() || !y.isFinite() ||
                x !in -SLACK..Geometry.STRIP_W + SLACK ||
                y !in -SLACK - stripH * Geometry.SLIVER..stripH + SLACK
            ) {
                badRequest("Stroke point out of bounds")
            }
        }
    }
}
