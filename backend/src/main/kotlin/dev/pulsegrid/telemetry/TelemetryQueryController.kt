package dev.pulsegrid.telemetry

import io.swagger.v3.oas.annotations.Operation
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * Read side of the telemetry API, consumed by the dashboard and the Go alert
 * evaluator. Bounds on every parameter are enforced here because they are
 * interpolated into ClickHouse SQL.
 */
@RestController
@RequestMapping("/api/v1")
class TelemetryQueryController(private val clickHouse: ClickHouseTelemetryRepository) {

    @GetMapping("/telemetry/recent")
    @Operation(summary = "Most recent telemetry samples across the fleet")
    suspend fun recent(@RequestParam(defaultValue = "25") limit: Int): List<TelemetrySample> {
        require(limit in 1..MAX_RECENT_LIMIT) { "limit must be between 1 and $MAX_RECENT_LIMIT" }
        return clickHouse.recent(limit)
    }

    @GetMapping("/telemetry/stats")
    @Operation(summary = "Aggregate telemetry over a trailing window")
    suspend fun stats(@RequestParam(defaultValue = "15") windowMinutes: Int): TelemetryStats {
        require(windowMinutes in 1..MAX_WINDOW_MINUTES) {
            "windowMinutes must be between 1 and $MAX_WINDOW_MINUTES"
        }
        return clickHouse.stats(windowMinutes)
    }

    @GetMapping("/devices/summary")
    @Operation(summary = "Device fleet liveness, bucketed by last reported event")
    suspend fun fleet(): FleetSummary = clickHouse.fleet()

    private companion object {
        const val MAX_RECENT_LIMIT = 500
        const val MAX_WINDOW_MINUTES = 1440
    }
}
