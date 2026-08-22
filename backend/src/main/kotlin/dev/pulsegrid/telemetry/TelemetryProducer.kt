package dev.pulsegrid.telemetry

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Component
import java.util.concurrent.TimeUnit

@Component
class TelemetryProducer(
    private val kafka: KafkaTemplate<String, TelemetryEvent>,
    @Value("\${pulsegrid.kafka.topic}") private val topic: String,
) : TelemetrySink {
    /**
     * Every send is issued before any is awaited, so the batch is pipelined
     * through the producer rather than serialised one round trip at a time.
     * Keyed by device id to keep a device's events in partition order.
     */
    override suspend fun publish(events: List<TelemetryEvent>) = withContext(Dispatchers.IO) {
        events.map { kafka.send(topic, it.deviceId, it) }.forEach { it.get(SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS) }
    }

    private companion object {
        const val SEND_TIMEOUT_SECONDS = 10L
    }
}
