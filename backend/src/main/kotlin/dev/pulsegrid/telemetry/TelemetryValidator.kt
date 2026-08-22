package dev.pulsegrid.telemetry

import org.springframework.stereotype.Component

@Component
class TelemetryValidator {
    fun isValid(event: TelemetryEvent) =
        event.deviceId.matches(Regex("PG-[A-Z0-9]{4,12}")) &&
        event.heartRate in 25..240 && event.speedKmh in 0.0..80.0 &&
        event.systolicPressure in 50..260 && event.diastolicPressure in 30..180 &&
        event.oxygenPercent in 50..100 && event.latitude in -90.0..90.0 &&
        event.longitude in -180.0..180.0
}
