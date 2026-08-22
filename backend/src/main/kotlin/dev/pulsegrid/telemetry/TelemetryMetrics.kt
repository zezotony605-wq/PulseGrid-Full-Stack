package dev.pulsegrid.telemetry

import io.micrometer.core.instrument.Counter
import io.micrometer.core.instrument.Gauge
import io.micrometer.core.instrument.MeterRegistry
import org.springframework.stereotype.Component
import java.util.concurrent.atomic.AtomicInteger

@Component
class TelemetryMetrics(registry: MeterRegistry) {
    val accepted: Counter = Counter.builder("pulsegrid.telemetry.accepted").description("Validated telemetry events accepted for Kafka").register(registry)
    val rejected: Counter = Counter.builder("pulsegrid.telemetry.rejected").description("Telemetry events rejected by validation").register(registry)
    val consumed: Counter = Counter.builder("pulsegrid.telemetry.consumed").description("Telemetry events persisted by Kafka consumers").register(registry)
    private val heartRate = AtomicInteger(0)
    private val oxygen = AtomicInteger(0)
    init {
        Gauge.builder("pulsegrid.health.heart_rate", heartRate) { it.get().toDouble() }.description("Most recent heart-rate reading").baseUnit("bpm").register(registry)
        Gauge.builder("pulsegrid.health.oxygen", oxygen) { it.get().toDouble() }.description("Most recent blood-oxygen reading").baseUnit("percent").register(registry)
    }
    fun recordLatest(event: TelemetryEvent) { heartRate.set(event.heartRate); oxygen.set(event.oxygenPercent) }
}
