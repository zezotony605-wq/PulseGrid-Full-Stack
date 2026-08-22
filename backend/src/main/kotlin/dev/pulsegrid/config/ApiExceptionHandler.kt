package dev.pulsegrid.config

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.reactive.function.client.WebClientException

/**
 * Turns the two failure modes the API actually has into RFC 7807 responses.
 *
 * Note there is no catch-all handler: `ResponseStatusException` carries its own
 * status and must keep reaching Spring's default handling rather than being
 * flattened to a 500 here.
 */
@RestControllerAdvice
class ApiExceptionHandler {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * Argument validation. Without this a rejected batch size or query bound
     * surfaced as a 500, which reads as a server fault rather than a bad call.
     */
    @ExceptionHandler(IllegalArgumentException::class)
    fun onInvalidRequest(exception: IllegalArgumentException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.message ?: "Invalid request").apply {
            title = "Invalid request"
        }

    /** ClickHouse unreachable or erroring: the gateway itself is healthy. */
    @ExceptionHandler(WebClientException::class)
    fun onStorageUnavailable(exception: WebClientException): ProblemDetail {
        log.warn("Telemetry storage is unavailable", exception)
        return ProblemDetail
            .forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, "Telemetry storage is unavailable")
            .apply { title = "Storage unavailable" }
    }
}
