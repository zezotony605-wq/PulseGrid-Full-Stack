package dev.pulsegrid.telemetry

import kotlinx.coroutines.reactor.awaitSingleOrNull
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
class IngestionAuditRepository(private val database: DatabaseClient) {
    suspend fun recordBatch(events: List<TelemetryEvent>) {
        if (events.isEmpty()) return
        database.sql("INSERT INTO telemetry_ingestion_batches (event_count, first_event_at, last_event_at) VALUES (:count, :first, :last)")
            .bind("count", events.size).bind("first", events.minOf { it.timestamp }).bind("last", events.maxOf { it.timestamp })
            .fetch().rowsUpdated().awaitSingleOrNull()
    }
}
