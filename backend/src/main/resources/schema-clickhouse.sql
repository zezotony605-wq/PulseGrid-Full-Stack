CREATE DATABASE IF NOT EXISTS pulsegrid;
CREATE TABLE IF NOT EXISTS pulsegrid.telemetry (
  event_id UUID, device_id LowCardinality(String), user_id UUID, timestamp DateTime64(3, 'UTC'),
  heart_rate UInt16, speed_kmh Float32, systolic_pressure UInt16, diastolic_pressure UInt16,
  oxygen_percent UInt8, latitude Float64, longitude Float64
) ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_id, device_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 365 DAY;
