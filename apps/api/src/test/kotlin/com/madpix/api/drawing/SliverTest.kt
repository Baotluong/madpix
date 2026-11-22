package com.madpix.api.drawing

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SliverTest {
    // Strip height 500 → the sliver band starts at y = 450.
    private val stripH = 500
    private fun stroke(vararg points: Double, width: Double = 2.0) = Stroke("#000000", width, points.toList())

    @Test
    fun `strokes above the band are dropped`() {
        assertEquals(emptyList(), sliverOf(listOf(stroke(10.0, 10.0, 500.0, 300.0)), stripH))
    }

    @Test
    fun `strokes inside the band are kept as they are`() {
        val s = stroke(10.0, 460.0, 200.0, 480.0)
        assertEquals(listOf(s), sliverOf(listOf(s), stripH))
    }

    @Test
    fun `a stroke entering the band starts at the cut line, not at the hidden point`() {
        // From (0, 0) straight down to (100, 500). Cut is at 450 - width/2 = 449.
        val clipped = sliverOf(listOf(stroke(0.0, 0.0, 100.0, 500.0)), stripH).single()
        assertEquals(listOf(89.8, 449.0, 100.0, 500.0), clipped.points.map { Math.round(it * 10) / 10.0 })
    }

    @Test
    fun `a stroke that leaves and re-enters the band becomes two strokes`() {
        val s = stroke(0.0, 480.0, 50.0, 100.0, 100.0, 480.0)
        val parts = sliverOf(listOf(s), stripH)
        assertEquals(2, parts.size)
        assertTrue(parts.all { p -> p.points.chunked(2).all { it[1] >= 449.0 } })
    }

    @Test
    fun `thick pens count from the edge of their ink`() {
        // Centre is 20 above the band, but a 60-wide pen reaches 30 below its centre.
        val s = stroke(10.0, 430.0, width = 60.0)
        assertEquals(listOf(s), sliverOf(listOf(s), stripH))
    }

    @Test
    fun `a dot in the band is kept`() {
        val dot = stroke(500.0, 470.0)
        assertEquals(listOf(dot), sliverOf(listOf(dot), stripH))
    }
}

class InviteCodesTest {
    @Test
    fun `codes are a word and a number, and typing them loosely still matches`() {
        repeat(200) { assertTrue(Regex("^[a-z]+[0-9]{1,2}$").matches(InviteCodes.random())) }
        assertEquals("goose14", InviteCodes.normalize(" Goose 14 "))
        assertEquals("goose14", InviteCodes.normalize("GOOSE-14"))
    }
}
