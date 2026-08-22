package dev.pulsegrid.telemetry

import kotlinx.coroutines.runBlocking
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Component

@Component
class TelemetryConsumer(
    private val clickHouse: ClickHouseTelemetryRepository,
    private val audit: IngestionAuditRepository,
    private val stream: TelemetryStream,
    private val metrics: TelemetryMetrics,
) {
    @KafkaListener(topics = ["\${pulsegrid.kafka.topic}"], concurrency = "\${KAFKA_CONSUMER_CONCURRENCY:3}", batch = "true")
    fun consume(events: List<TelemetryEvent>) = runBlocking {
        clickHouse.insertBatch(events)
        audit.recordBatch(events)
        events.forEach { stream.publish(it); metrics.recordLatest(it) }
        metrics.consumed.increment(events.size.toDouble())
    }
}
