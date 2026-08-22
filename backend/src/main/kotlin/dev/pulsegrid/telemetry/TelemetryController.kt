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
        require(events.size in 1..5_000) { "Batch must contain 1..5000 events" }
        return service.ingest(events)
    }
}
