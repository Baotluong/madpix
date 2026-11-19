package com.madpix.api.push

import org.slf4j.LoggerFactory
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

@ConfigurationProperties("madpix.push")
data class PushProperties(val enabled: Boolean = true, val accessToken: String = "")

/**
 * Sends through Expo's push service, which forwards to Firebase (Android) and APNs (iOS),
 * so the API never handles those credentials itself.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
@Component
class ExpoPushSender(private val props: PushProperties) : PushSender {
    private val log = LoggerFactory.getLogger(javaClass)
    private val client = RestClient.builder().baseUrl("https://exp.host/--/api/v2").build()

    override fun send(messages: List<PushMessage>) {
        val valid = messages.filter { it.to.startsWith("ExponentPushToken[") || it.to.startsWith("ExpoPushToken[") }
        if (valid.isEmpty()) return
        if (!props.enabled) {
            log.info("Push disabled; would send {} message(s)", valid.size)
            return
        }
        try {
            client.post()
                .uri("/push/send")
                .contentType(MediaType.APPLICATION_JSON)
                .headers { if (props.accessToken.isNotBlank()) it.setBearerAuth(props.accessToken) }
                .body(valid.map { it.toExpo() })
                .retrieve()
                .toBodilessEntity()
        } catch (e: Exception) {
            // A missed notification shouldn't break anything: the app also refreshes when opened.
            log.warn("Push send failed: {}", e.message)
        }
    }

    private fun PushMessage.toExpo() = mapOf(
        "to" to to,
        "title" to title,
        "body" to body,
        "data" to data,
        "sound" to "default",
        "channelId" to "turns",
    )
}
