package dev.pulsegrid.telemetry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class TelemetryReadModelTest {
    @Test
    fun `empty stats keep the requested window so the dashboard can label it`() {
        val stats = TelemetryStats.empty(60)

        assertEquals(60, stats.windowMinutes)
        assertEquals(0L, stats.events)
        assertEquals(0.0, stats.avgHeartRate)
    }

    @Test
    fun `offline devices are whatever is left after the live buckets`() {
        val summary = FleetSummary(total = 100, online = 70, degraded = 12, offline = 100 - 70 - 12)

        assertEquals(18L, summary.offline)
        assertEquals(summary.total, summary.online + summary.degraded + summary.offline)
    }
}
