package com.madpix.api.push

import com.madpix.api.drawing.DrawingFinished
import com.madpix.api.drawing.TurnStarted
import com.madpix.api.player.PlayerRepository
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionalEventListener

/** Turns game events into pushes, after the transaction commits and off the request thread. */
@Component
class TurnNotifications(private val players: PlayerRepository, private val push: PushSender) {

    @Async
    @TransactionalEventListener
    fun onTurnStarted(e: TurnStarted) {
        val token = players.findById(e.playerId)?.pushToken ?: return
        push.send(
            listOf(
                PushMessage(
                    to = token,
                    title = "Your turn to draw",
                    body = "${e.previousArtist} folded their strip. Pick up where they left off!",
                    data = mapOf("drawingId" to e.drawingId),
                ),
            ),
        )
    }

    @Async
    @TransactionalEventListener
    fun onFinished(e: DrawingFinished) {
        val messages = players.findByIds(e.playerIds - e.lastArtistId).mapNotNull { p ->
            p.pushToken?.let {
                PushMessage(
                    to = it,
                    title = "The drawing is done!",
                    body = "Everyone's folded their strip. Come unfold it.",
                    data = mapOf("drawingId" to e.drawingId),
                )
            }
        }
        push.send(messages)
    }
}
