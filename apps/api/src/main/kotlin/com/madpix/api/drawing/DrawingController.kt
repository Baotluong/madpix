package com.madpix.api.drawing

import com.madpix.api.player.CurrentPlayer
import com.madpix.api.player.Player
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
class DrawingController(private val service: DrawingService) {

    data class NewDrawing(
        @field:Min(2) @field:Max(4) val artistCount: Int,
        @field:Size(max = 30) val prompt: String? = null,
        /** Public drawings can be joined by anyone through "Play now". */
        val public: Boolean = false,
    )

    /** For "Play now" and rematches: an inspo word the app picked, used if the new drawing gets one. */
    data class PromptRequest(@field:Size(max = 30) val prompt: String? = null)

    data class BlockRequest(@field:Min(0) @field:Max(3) val position: Int)

    data class JoinRequest(@field:NotBlank @field:Size(max = 20) val code: String)

    data class StripRequest(val strokes: List<Stroke>)

    data class ReportRequest(@field:Size(max = 200) val reason: String? = null)

    @PostMapping("/drawings")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@CurrentPlayer me: Player, @Valid @RequestBody body: NewDrawing) =
        service.create(me, body.artistCount, body.prompt, body.public)

    @PostMapping("/drawings/play-now")
    fun playNow(@CurrentPlayer me: Player, @Valid @RequestBody body: PromptRequest?) =
        service.playNow(me, body?.prompt)

    @PostMapping("/drawings/{id}/rematch")
    fun rematch(@CurrentPlayer me: Player, @PathVariable id: String, @Valid @RequestBody body: PromptRequest?) =
        service.rematch(me, id, body?.prompt)

    @PostMapping("/drawings/{id}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun block(@CurrentPlayer me: Player, @PathVariable id: String, @Valid @RequestBody body: BlockRequest) =
        service.block(me, id, body.position)

    @GetMapping("/drawings")
    fun list(@CurrentPlayer me: Player) = service.list(me)

    @GetMapping("/drawings/{id}")
    fun get(@CurrentPlayer me: Player, @PathVariable id: String) = service.get(me, id)

    @PostMapping("/drawings/join")
    fun join(@CurrentPlayer me: Player, @Valid @RequestBody body: JoinRequest) = service.join(me, body.code)

    @PostMapping("/drawings/{id}/strip")
    fun submitStrip(@CurrentPlayer me: Player, @PathVariable id: String, @RequestBody body: StripRequest) =
        service.submitStrip(me, id, body.strokes)

    @PostMapping("/drawings/{id}/report")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun report(@CurrentPlayer me: Player, @PathVariable id: String, @Valid @RequestBody body: ReportRequest?) =
        service.report(me, id, body?.reason)

    /** A peek at a drawing before joining it: who's in and how many spots are left. */
    @GetMapping("/invites/{code}")
    fun invite(@PathVariable code: String) = service.invite(code)
}
