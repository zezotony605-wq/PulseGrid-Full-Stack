package dev.pulsegrid.telemetry

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.Instant
import java.util.UUID

data class TelemetryEvent(
    @JsonProperty("event_id") val eventId: UUID = UUID.randomUUID(),
    @JsonProperty("device_id") val deviceId: String,
    @JsonProperty("user_id") val userId: UUID,
    val timestamp: Instant = Instant.now(),
    @JsonProperty("heart_rate") val heartRate: Int,
    @JsonProperty("speed_kmh") val speedKmh: Double,
    @JsonProperty("systolic_pressure") val systolicPressure: Int,
    @JsonProperty("diastolic_pressure") val diastolicPressure: Int,
    @JsonProperty("oxygen_percent") val oxygenPercent: Int,
    val latitude: Double,
    val longitude: Double,
)

data class IngestionResult(val accepted: Int, val rejected: Int, val receivedAt: Instant = Instant.now())
