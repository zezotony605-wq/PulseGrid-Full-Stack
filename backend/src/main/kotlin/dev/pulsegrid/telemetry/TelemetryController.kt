package dev.pulsegrid.telemetry

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import org.springframework.security.access.prepost.PreAuthorize

@RestController
@RequestMapping("/api/v1/telemetry")
class TelemetryController(private val service: TelemetryService) {
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasAuthority('SCOPE_telemetry:write')")
    suspend fun ingest(@RequestBody event: TelemetryEvent) = service.ingest(listOf(event))

    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasAuthority('SCOPE_telemetry:write')")
    suspend fun ingestBatch(@RequestBody events: List<TelemetryEvent>): IngestionResult {
        // ApiExceptionHandler maps this to a 400. Before it existed the caller
        // saw a 500 and retried a batch that would never be accepted.
        require(events.size in 1..MAX_BATCH_SIZE) { "Batch must contain 1..$MAX_BATCH_SIZE events" }
        return service.ingest(events)
    }

    private companion object {
        const val MAX_BATCH_SIZE = 5_000
    }
}
