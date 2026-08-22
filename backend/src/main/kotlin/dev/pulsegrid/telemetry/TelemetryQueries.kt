package dev.pulsegrid.telemetry

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.Instant
import java.util.UUID

/**
 * Read models for the dashboard.
 *
 * The ingest model carries `user_id`; the read models deliberately do not.
 * Nothing on the control centre needs to resolve a measurement back to a
 * person, so the identifier stops at the storage boundary.
 */
data class TelemetrySample(
    @JsonProperty("event_id") val eventId: UUID,
    @JsonProperty("device_id") val deviceId: String,
    val timestamp: Instant,
    @JsonProperty("heart_rate") val heartRate: Int,
    @JsonProperty("speed_kmh") val speedKmh: Double,
    @JsonProperty("systolic_pressure") val systolicPressure: Int,
    @JsonProperty("diastolic_pressure") val diastolicPressure: Int,
    @JsonProperty("oxygen_percent") val oxygenPercent: Int,
    val latitude: Double,
    val longitude: Double,
)

data class TelemetryStats(
    val events: Long,
    val devices: Long,
    val avgHeartRate: Double,
    val minHeartRate: Int,
    val maxHeartRate: Int,
    val avgOxygenPercent: Double,
    val windowMinutes: Int,
) {
    companion object {
        fun empty(windowMinutes: Int) = TelemetryStats(0, 0, 0.0, 0, 0, 0.0, windowMinutes)
    }
}

/**
 * Liveness buckets are derived from the last event per device rather than from
 * a status column, so a device that stops reporting ages out on its own
 * instead of waiting for something to mark it offline.
 */
data class FleetSummary(
    val total: Long,
    val online: Long,
    val degraded: Long,
    val offline: Long,
) {
    companion object {
        val EMPTY = FleetSummary(0, 0, 0, 0)
    }
}
