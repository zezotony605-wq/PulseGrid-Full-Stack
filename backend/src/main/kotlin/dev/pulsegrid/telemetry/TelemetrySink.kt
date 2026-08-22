package dev.pulsegrid.telemetry

/**
 * Where validated telemetry goes next.
 *
 * The service depends on this rather than on the Kafka template directly, so
 * the ingest path can be exercised without a broker.
 */
interface TelemetrySink {
    suspend fun publish(events: List<TelemetryEvent>)
}
