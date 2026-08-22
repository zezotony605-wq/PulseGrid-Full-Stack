package dev.pulsegrid.config

import com.fasterxml.jackson.databind.ObjectMapper
import dev.pulsegrid.telemetry.TelemetryStream
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping
import org.springframework.web.reactive.socket.WebSocketHandler
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter

@Configuration
class WebSocketConfig(private val stream: TelemetryStream, private val mapper: ObjectMapper) {
    @Bean fun telemetryWebSocketHandler() = WebSocketHandler { session ->
        session.send(stream.events().map { session.textMessage(mapper.writeValueAsString(it)) })
    }
    @Bean fun webSocketMapping(handler: WebSocketHandler) = SimpleUrlHandlerMapping(mapOf("/ws/telemetry" to handler), -1)
    @Bean fun handlerAdapter() = WebSocketHandlerAdapter()
}
