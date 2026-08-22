package dev.pulsegrid.telemetry

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Service

@Service
class TelemetryService(
    private val validator: TelemetryValidator,
    private val sink: TelemetrySink,
    private val metrics: TelemetryMetrics,
) {
    /**
     * Invalid events are dropped and counted rather than failing the batch: one
     * bad reading from one device must not cost the other events in the same
     * HTTP call, and the rejected counter is what surfaces the problem.
     */
    suspend fun ingest(events: List<TelemetryEvent>): IngestionResult {
        val (valid, invalid) = withContext(Dispatchers.Default) { events.partition(validator::isValid) }
        sink.publish(valid)
        metrics.accepted.increment(valid.size.toDouble())
        metrics.rejected.increment(invalid.size.toDouble())
        return IngestionResult(valid.size, invalid.size)
    }
}
