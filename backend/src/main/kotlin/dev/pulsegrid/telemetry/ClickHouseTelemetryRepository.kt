package dev.pulsegrid.telemetry

import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.reactor.awaitSingleOrNull
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Repository
import org.springframework.web.reactive.function.client.WebClient

@Repository
class ClickHouseTelemetryRepository(
    builder: WebClient.Builder,
    private val mapper: ObjectMapper,
    @Value("\${pulsegrid.clickhouse.url}") baseUrl: String,
    @Value("\${pulsegrid.clickhouse.database}") private val database: String,
    @Value("\${pulsegrid.clickhouse.username}") username: String,
    @Value("\${pulsegrid.clickhouse.password}") password: String,
) {
    private val client = builder.baseUrl(baseUrl).defaultHeaders { it.setBasicAuth(username, password) }.build()

    suspend fun insertBatch(events: List<TelemetryEvent>) {
        if (events.isEmpty()) return
        val body = events.joinToString("\n") { mapper.writeValueAsString(it) }
        client.post().uri { uri -> uri.queryParam("database", database).queryParam("query", "INSERT INTO telemetry FORMAT JSONEachRow").build() }
            .contentType(MediaType.APPLICATION_NDJSON).bodyValue(body).retrieve().toBodilessEntity().awaitSingleOrNull()
    }
}
