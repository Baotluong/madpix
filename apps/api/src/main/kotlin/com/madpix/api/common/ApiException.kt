package com.madpix.api.common

import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.web.ErrorResponseException

/** Spring renders these as RFC 9457 problem details: `{"status": 409, "detail": "It's not your turn"}`. */
class ApiException(status: HttpStatus, detail: String) :
    ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null)

fun badRequest(detail: String): Nothing = throw ApiException(HttpStatus.BAD_REQUEST, detail)
fun unauthorized(detail: String): Nothing = throw ApiException(HttpStatus.UNAUTHORIZED, detail)
fun notFound(detail: String): Nothing = throw ApiException(HttpStatus.NOT_FOUND, detail)
fun conflict(detail: String): Nothing = throw ApiException(HttpStatus.CONFLICT, detail)
