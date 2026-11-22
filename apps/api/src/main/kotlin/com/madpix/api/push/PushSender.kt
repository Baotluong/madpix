package com.madpix.api.push

data class PushMessage(
    /** An Expo push token, `ExponentPushToken[...]`. */
    val to: String,
    val title: String,
    val body: String,
    val data: Map<String, String> = emptyMap(),
)

fun interface PushSender {
    fun send(messages: List<PushMessage>)
}
