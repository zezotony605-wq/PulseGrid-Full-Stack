package dev.pulsegrid.telemetry

import org.springframework.stereotype.Component
import reactor.core.publisher.Flux
import reactor.core.publisher.Sinks

@Component
class TelemetryStream {
    private val sink = Sinks.many().multicast().directBestEffort<TelemetryEvent>()
    fun publish(event: TelemetryEvent) { sink.tryEmitNext(event) }
    fun events(): Flux<TelemetryEvent> = sink.asFlux()
}
