package com.madpix.api.drawing

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * Checks for turns that ran out every few minutes. The machine sleeps when nobody's playing, so
 * this only runs while it's awake; "Play now" also checks before it looks for a drawing.
 */
@Component
class TurnTimeouts(private val service: DrawingService) {
    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT5M")
    fun run() = service.expireTurns()
}
