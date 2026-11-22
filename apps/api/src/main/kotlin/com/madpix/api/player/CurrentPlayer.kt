package com.madpix.api.player

import com.madpix.api.common.unauthorized
import org.springframework.core.MethodParameter
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import org.springframework.web.bind.support.WebDataBinderFactory
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.method.support.ModelAndViewContainer

/** Marks a controller parameter as the signed-in player (from `Authorization: Bearer <token>`). */
@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class CurrentPlayer

@Component
class CurrentPlayerResolver(private val players: PlayerRepository) : HandlerMethodArgumentResolver {

    override fun supportsParameter(parameter: MethodParameter) =
        parameter.hasParameterAnnotation(CurrentPlayer::class.java) &&
            parameter.parameterType == Player::class.java

    override fun resolveArgument(
        parameter: MethodParameter,
        mavContainer: ModelAndViewContainer?,
        webRequest: NativeWebRequest,
        binderFactory: WebDataBinderFactory?,
    ): Player {
        val header = webRequest.getHeader(HttpHeaders.AUTHORIZATION)
        val token = header?.removePrefix("Bearer ")?.trim()
        if (header == null || !header.startsWith("Bearer ") || token.isNullOrEmpty()) {
            unauthorized("Missing player token")
        }
        return players.findByTokenHash(Tokens.hash(token)) ?: unauthorized("Unknown player token")
    }
}
