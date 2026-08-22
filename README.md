# PulseGrid

High-performance health and IoT telemetry platform with secured device ingestion, Kafka buffering, asynchronous Kotlin consumers, analytical storage and full observability.

## Stack

- **Producer:** multithreaded C++20 simulator with automatic JWT provisioning and batched HTTP ingestion
- **Streaming:** Apache Kafka 4.3 with a six-partition telemetry topic and idempotent producers
- **Backend:** Kotlin, Spring Boot 3, WebFlux, coroutines, Spring Security, JWT, OpenAPI and WebSocket
- **Data:** ClickHouse for telemetry; PostgreSQL 17 for identity, device and ingestion-audit data
- **Observability:** Micrometer, Prometheus and provisioned Grafana dashboards
- **Frontend:** Next.js 16 and React 19 live telemetry control center
- **Testing:** k6 constant-arrival-rate load test, Kotlin validation tests and C++ compiler checks

## Start the complete platform

```bash
docker compose up --build
```

Open:

- PulseGrid API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (`admin` / `pulsegrid` by default; override before shared use)

The simulator obtains a one-hour JWT, sends authenticated telemetry batches to Spring, and the gateway publishes accepted events to Kafka. Kafka consumers batch-write ClickHouse, append PostgreSQL audit records, update Prometheus health gauges and broadcast the live WebSocket feed.

## Run the 10k RPS test

This is intentionally a separate Docker Compose profile so it cannot start accidentally:

```bash
TARGET_RPS=10000 TEST_DURATION=30s docker compose --profile load-test run --rm k6
```

The test fails when the error rate reaches 1%, p95 exceeds 150 ms, p99 exceeds 250 ms, or any telemetry request is rejected. Results are written to `load-tests/results/summary.json`.

Do not write “handled 10,000 requests/second with zero errors” in a CV until that exact test passes on documented hardware. A safe pre-benchmark statement is:

> Designed and load-tested a Kafka-backed telemetry pipeline with configurable constant-arrival-rate k6 scenarios targeting up to 10,000 requests per second.

After a real passing run, replace “targeting” with the measured sustained RPS, p99 latency and error rate from the summary.

## Local API example

```bash
TOKEN=$(curl -s http://localhost:8080/api/v1/auth/device-token \
  -H 'Content-Type: application/json' \
  -d '{"deviceId":"PG-MANUAL1","deviceSecret":"dev-only-change-me"}' | jq -r .accessToken)

curl -X POST http://localhost:8080/api/v1/telemetry \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"device_id":"PG-A7F2","user_id":"00000000-0000-4000-8000-000000000001","heart_rate":86,"speed_kmh":12.4,"systolic_pressure":121,"diastolic_pressure":78,"oxygen_percent":98,"latitude":30.0444,"longitude":31.2357}'
```

## Repository map

```text
app/             Next.js telemetry dashboard
backend/         Kotlin/Spring gateway, Kafka consumers and security
simulator/       JWT-aware multithreaded C++ producer
observability/   Prometheus and provisioned Grafana dashboards
load-tests/      k6 performance scenario and generated results
docs/            Architecture and production notes
```
