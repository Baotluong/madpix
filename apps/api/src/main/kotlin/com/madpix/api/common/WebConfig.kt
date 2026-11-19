package com.madpix.api.common

import com.madpix.api.player.CurrentPlayerResolver
import org.springframework.context.annotation.Configuration
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig(private val currentPlayer: CurrentPlayerResolver) : WebMvcConfigurer {
    override fun addArgumentResolvers(resolvers: MutableList<HandlerMethodArgumentResolver>) {
        resolvers += currentPlayer
    }

    // The web app calls the API from another origin. Auth is a bearer token, not a
    // cookie, so allowing any origin doesn't let other sites act as a player.
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/**")
            .allowedOrigins("*")
            .allowedMethods("GET", "POST", "PATCH")
            .allowedHeaders("Authorization", "Content-Type")
    }
}
