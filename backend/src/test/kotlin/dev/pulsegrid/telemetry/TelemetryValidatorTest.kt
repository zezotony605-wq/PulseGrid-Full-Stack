package dev.pulsegrid.telemetry

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.UUID

class TelemetryValidatorTest {
    private val validator = TelemetryValidator()
    private val valid = TelemetryEvent(
        deviceId = "PG-A7F2", userId = UUID.randomUUID(), heartRate = 86,
        speedKmh = 12.4, systolicPressure = 121, diastolicPressure = 78,
        oxygenPercent = 98, latitude = 30.0444, longitude = 31.2357,
    )

    @Test fun `accepts physiological reading in valid range`() = assertTrue(validator.isValid(valid))
    @Test fun `rejects impossible oxygen reading`() = assertFalse(validator.isValid(valid.copy(oxygenPercent = 120)))
    @Test fun `rejects untrusted device identifier`() = assertFalse(validator.isValid(valid.copy(deviceId = "watch-1")))
}
