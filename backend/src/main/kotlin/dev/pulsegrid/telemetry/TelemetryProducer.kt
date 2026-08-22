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
) {
    suspend fun publish(events: List<TelemetryEvent>) = withContext(Dispatchers.IO) {
        events.map { kafka.send(topic, it.deviceId, it) }.forEach { it.get(10, TimeUnit.SECONDS) }
    }
}
