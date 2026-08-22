package dev.pulsegrid.telemetry

import io.micrometer.core.instrument.simple.SimpleMeterRegistry
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.UUID

class TelemetryServiceTest {
    private class RecordingSink : TelemetrySink {
        val published = mutableListOf<TelemetryEvent>()
        var calls = 0
        override suspend fun publish(events: List<TelemetryEvent>) {
            calls += 1
            published += events
        }
    }

    private val sink = RecordingSink()
    private val metrics = TelemetryMetrics(SimpleMeterRegistry())
    private val service = TelemetryService(TelemetryValidator(), sink, metrics)

    private fun event(deviceId: String = "PG-A7F2", heartRate: Int = 86) = TelemetryEvent(
        deviceId = deviceId, userId = UUID.randomUUID(), heartRate = heartRate,
        speedKmh = 12.4, systolicPressure = 121, diastolicPressure = 78,
        oxygenPercent = 98, latitude = 30.0444, longitude = 31.2357,
    )

    @Test
    fun `publishes only the valid events and reports both counts`() = runBlocking {
        val result = service.ingest(
            listOf(
                event(),
                event(deviceId = "watch-1"),
                event(heartRate = 900),
                event(deviceId = "PG-C109"),
            ),
        )

        assertEquals(2, result.accepted)
        assertEquals(2, result.rejected)
        assertEquals(listOf("PG-A7F2", "PG-C109"), sink.published.map { it.deviceId })
    }

    @Test
    fun `counts accepted and rejected events on the meter registry`() = runBlocking {
        service.ingest(listOf(event(), event(deviceId = "watch-1")))

        assertEquals(1.0, metrics.accepted.count())
        assertEquals(1.0, metrics.rejected.count())
    }

    @Test
    fun `a batch of only invalid events still resolves without publishing any`() = runBlocking {
        val result = service.ingest(listOf(event(deviceId = "watch-1"), event(heartRate = 900)))

        assertEquals(0, result.accepted)
        assertEquals(2, result.rejected)
        assertTrue(sink.published.isEmpty())
    }

    @Test
    fun `an empty batch is a no-op that still answers`() = runBlocking {
        val result = service.ingest(emptyList())

        assertEquals(0, result.accepted)
        assertEquals(0, result.rejected)
        assertEquals(1, sink.calls)
    }
}
