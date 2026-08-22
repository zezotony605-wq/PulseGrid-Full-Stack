package dev.pulsegrid.telemetry

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Service

@Service
class TelemetryService(
    private val validator: TelemetryValidator,
    private val producer: TelemetryProducer,
    private val metrics: TelemetryMetrics,
) {
    suspend fun ingest(events: List<TelemetryEvent>): IngestionResult {
        val (valid, invalid) = withContext(Dispatchers.Default) { events.partition(validator::isValid) }
        producer.publish(valid)
        metrics.accepted.increment(valid.size.toDouble())
        metrics.rejected.increment(invalid.size.toDouble())
        return IngestionResult(valid.size, invalid.size)
    }
}
