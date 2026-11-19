package com.madpix.api.player

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.Clock
import java.util.UUID

@RestController
@RequestMapping("/players")
class PlayerController(private val players: PlayerRepository, private val clock: Clock) {

    data class NewPlayer(
        @field:NotBlank @field:Size(max = 20) val name: String,
    )

    data class PlayerUpdate(
        @field:Size(min = 1, max = 20) val name: String? = null,
        @field:Size(max = 200) val pushToken: String? = null,
    )

    data class PlayerView(val id: String, val name: String) {
        constructor(p: Player) : this(p.id, p.name)
    }

    /** The token is shown once, here. The app keeps it; we only keep its hash. */
    data class NewPlayerResponse(val player: PlayerView, val token: String)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody body: NewPlayer): NewPlayerResponse {
        val id = UUID.randomUUID().toString()
        val token = Tokens.newToken()
        val name = body.name.trim()
        players.create(id, Tokens.hash(token), name, clock.instant())
        return NewPlayerResponse(PlayerView(id, name), token)
    }

    @GetMapping("/me")
    fun me(@CurrentPlayer me: Player) = PlayerView(me)

    @PatchMapping("/me")
    fun update(@CurrentPlayer me: Player, @Valid @RequestBody body: PlayerUpdate): PlayerView {
        players.update(me.id, body.name?.trim()?.ifEmpty { null }, body.pushToken)
        return PlayerView(players.findById(me.id)!!)
    }
}
