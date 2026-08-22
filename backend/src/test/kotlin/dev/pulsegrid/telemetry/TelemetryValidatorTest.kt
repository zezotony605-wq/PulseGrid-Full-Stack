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

    @Test
    fun `accepts the inclusive bounds of every measurement`() {
        assertTrue(validator.isValid(valid.copy(heartRate = 25)))
        assertTrue(validator.isValid(valid.copy(heartRate = 240)))
        assertTrue(validator.isValid(valid.copy(speedKmh = 0.0)))
        assertTrue(validator.isValid(valid.copy(speedKmh = 80.0)))
        assertTrue(validator.isValid(valid.copy(oxygenPercent = 50)))
        assertTrue(validator.isValid(valid.copy(oxygenPercent = 100)))
    }

    @Test
    fun `rejects values just outside every bound`() {
        assertFalse(validator.isValid(valid.copy(heartRate = 24)))
        assertFalse(validator.isValid(valid.copy(heartRate = 241)))
        assertFalse(validator.isValid(valid.copy(speedKmh = -0.1)))
        assertFalse(validator.isValid(valid.copy(speedKmh = 80.1)))
        assertFalse(validator.isValid(valid.copy(systolicPressure = 49)))
        assertFalse(validator.isValid(valid.copy(diastolicPressure = 181)))
    }

    @Test
    fun `rejects coordinates outside the globe`() {
        assertFalse(validator.isValid(valid.copy(latitude = 90.1)))
        assertFalse(validator.isValid(valid.copy(longitude = -180.1)))
    }

    @Test
    fun `constrains the device identifier to the provisioning format`() {
        assertTrue(validator.isValid(valid.copy(deviceId = "PG-A7F2")))
        assertTrue(validator.isValid(valid.copy(deviceId = "PG-ABCDEF123456")))
        // Too short, too long, lowercase and an unprefixed id are all rejected.
        assertFalse(validator.isValid(valid.copy(deviceId = "PG-A7F")))
        assertFalse(validator.isValid(valid.copy(deviceId = "PG-ABCDEF1234567")))
        assertFalse(validator.isValid(valid.copy(deviceId = "pg-a7f2")))
        assertFalse(validator.isValid(valid.copy(deviceId = "A7F2")))
    }
}
