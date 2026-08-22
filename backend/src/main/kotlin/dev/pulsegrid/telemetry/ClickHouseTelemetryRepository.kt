package dev.pulsegrid.telemetry

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.reactor.awaitSingleOrNull
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Repository
import org.springframework.web.reactive.function.client.WebClient
import java.time.Instant
import java.util.UUID

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
        client.post()
            .uri { uri ->
                uri.queryParam("database", database)
                    .queryParam("query", "INSERT INTO telemetry FORMAT JSONEachRow")
                    .build()
            }
            .contentType(MediaType.APPLICATION_NDJSON)
            .bodyValue(body)
            .retrieve()
            .toBodilessEntity()
            .awaitSingleOrNull()
    }

    /**
     * Most recent samples across the fleet.
     *
     * `timestamp` is projected as epoch millis instead of ClickHouse's default
     * `YYYY-MM-DD hh:mm:ss.SSS` rendering, which is not a valid ISO-8601
     * instant and would need a bespoke deserialiser on every consumer.
     */
    suspend fun recent(limit: Int): List<TelemetrySample> {
        val rows = query(
            SampleRow::class.java,
            """
            SELECT event_id, device_id, toUnixTimestamp64Milli(timestamp) AS timestamp_ms,
                   heart_rate, speed_kmh, systolic_pressure, diastolic_pressure,
                   oxygen_percent, latitude, longitude
            FROM telemetry
            ORDER BY timestamp DESC
            LIMIT $limit
            """.trimIndent(),
        )
        return rows.map { row ->
            TelemetrySample(
                eventId = UUID.fromString(row.eventId),
                deviceId = row.deviceId,
                timestamp = Instant.ofEpochMilli(row.timestampMs),
                heartRate = row.heartRate,
                speedKmh = row.speedKmh,
                systolicPressure = row.systolicPressure,
                diastolicPressure = row.diastolicPressure,
                oxygenPercent = row.oxygenPercent,
                latitude = row.latitude,
                longitude = row.longitude,
            )
        }
    }

    suspend fun stats(windowMinutes: Int): TelemetryStats {
        val row = query(
            StatsRow::class.java,
            """
            SELECT count() AS events,
                   uniqExact(device_id) AS devices,
                   avg(heart_rate) AS avg_heart_rate,
                   min(heart_rate) AS min_heart_rate,
                   max(heart_rate) AS max_heart_rate,
                   avg(oxygen_percent) AS avg_oxygen_percent
            FROM telemetry
            WHERE timestamp >= now() - INTERVAL $windowMinutes MINUTE
            """.trimIndent(),
        ).firstOrNull() ?: return TelemetryStats.empty(windowMinutes)

        // An empty window aggregates to zero rows, and min/max over nothing is
        // 0 rather than null, so report the empty stats rather than a 0 bpm
        // reading that looks like a measurement.
        if (row.events == 0L) return TelemetryStats.empty(windowMinutes)

        return TelemetryStats(
            events = row.events,
            devices = row.devices,
            avgHeartRate = row.avgHeartRate,
            minHeartRate = row.minHeartRate,
            maxHeartRate = row.maxHeartRate,
            avgOxygenPercent = row.avgOxygenPercent,
            windowMinutes = windowMinutes,
        )
    }

    /**
     * Bucket every device by its own last event. The buckets are computed from
     * one `last_seen` per device so a device that reported in both windows is
     * counted once, keeping `offline` non-negative.
     */
    suspend fun fleet(): FleetSummary {
        val row = query(
            FleetRow::class.java,
            """
            SELECT count() AS total,
                   countIf(last_seen >= now() - INTERVAL 1 MINUTE) AS online,
                   countIf(last_seen >= now() - INTERVAL 5 MINUTE
                           AND last_seen < now() - INTERVAL 1 MINUTE) AS degraded
            FROM (
                SELECT device_id, max(timestamp) AS last_seen
                FROM telemetry
                WHERE timestamp >= now() - INTERVAL 24 HOUR
                GROUP BY device_id
            )
            """.trimIndent(),
        ).firstOrNull() ?: return FleetSummary.EMPTY

        return FleetSummary(
            total = row.total,
            online = row.online,
            degraded = row.degraded,
            offline = row.total - row.online - row.degraded,
        )
    }

    /**
     * ClickHouse quotes 64-bit integers as JSON strings by default, which turns
     * every `count()` and `uniqExact()` into a string on the wire. Turning that
     * off keeps the aggregates as numbers instead of relying on the client's
     * coercion rules.
     */
    private suspend fun <T> query(type: Class<T>, sql: String): List<T> {
        val body = client.post()
            .uri { uri ->
                uri.queryParam("database", database)
                    .queryParam("output_format_json_quote_64bit_integers", 0)
                    .build()
            }
            .contentType(MediaType.TEXT_PLAIN)
            .bodyValue("$sql FORMAT JSONEachRow")
            .retrieve()
            .bodyToMono(String::class.java)
            .awaitSingleOrNull()
            ?: return emptyList()

        return body.lineSequence()
            .filter { it.isNotBlank() }
            .map { mapper.readValue(it, type) }
            .toList()
    }

    private data class SampleRow(
        @JsonProperty("event_id") val eventId: String,
        @JsonProperty("device_id") val deviceId: String,
        @JsonProperty("timestamp_ms") val timestampMs: Long,
        @JsonProperty("heart_rate") val heartRate: Int,
        @JsonProperty("speed_kmh") val speedKmh: Double,
        @JsonProperty("systolic_pressure") val systolicPressure: Int,
        @JsonProperty("diastolic_pressure") val diastolicPressure: Int,
        @JsonProperty("oxygen_percent") val oxygenPercent: Int,
        val latitude: Double,
        val longitude: Double,
    )

    private data class StatsRow(
        val events: Long,
        val devices: Long,
        @JsonProperty("avg_heart_rate") val avgHeartRate: Double,
        @JsonProperty("min_heart_rate") val minHeartRate: Int,
        @JsonProperty("max_heart_rate") val maxHeartRate: Int,
        @JsonProperty("avg_oxygen_percent") val avgOxygenPercent: Double,
    )

    private data class FleetRow(val total: Long, val online: Long, val degraded: Long)
}
