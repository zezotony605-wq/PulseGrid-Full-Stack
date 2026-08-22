# Alert evaluation

The Go service in `alerting/` turns telemetry into alerts. It is deliberately
small: one rule table, one poll loop, three HTTP endpoints, no third-party
dependencies.

## Why it polls instead of consuming Kafka

Joining the telemetry consumer group would make alerting share offsets with
storage. Two consequences follow, and both are bad:

- A rule change that needs a replay would rewind offsets that the ClickHouse
  writer owns.
- A slow or crash-looping evaluator would trigger group rebalances that stall
  persistence.

Reading the gateway's `GET /api/v1/telemetry/recent` keeps the two paths
independent. The cost is that alerting is as fresh as the poll interval
(5 s by default) rather than per-event, which is well inside the response time
for the thresholds below.

## Rules

Evaluation order is fixed, and critical rules are listed before the warning
bands that overlap them, so the first alert for a sample is always the worst.

| Rule | Severity | Fires when |
|---|---|---|
| `hypoxaemia` | critical | SpO₂ < 90% |
| `hypertensive_crisis` | critical | systolic ≥ 180 or diastolic ≥ 120 mmHg |
| `tachycardia` | critical | heart rate ≥ 150 bpm |
| `low_oxygen` | warning | 90% ≤ SpO₂ < 95% |
| `stage_2_hypertension` | warning | 140 ≤ systolic < 180 mmHg |
| `elevated_heart_rate` | warning | 120 ≤ heart rate < 150 bpm |

The bands do not overlap: a sample at exactly 90% SpO₂ is a warning, not a
critical, and 180 mmHg systolic is a crisis rather than stage 2. Both edges are
covered by tests.

These thresholds follow common clinical reference ranges for adults at rest.
They are demonstration values for a telemetry pipeline, not medical guidance,
and a real deployment would make them per-patient and clinician-reviewed.

## Deduplication

Each poll re-reads an overlapping window, so the same event is returned several
times. The store skips any `event_id` it has already evaluated; without that, a
single breach would be counted once per poll for as long as it stayed in the
window. The dedupe set is cleared once it grows past twenty times the alert
capacity, which is far longer than an event stays in the window.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/healthz` | `200` when the last poll reached the gateway, `503` otherwise |
| `GET` | `/api/v1/alerts` | Retained alerts, newest first |
| `GET` | `/metrics` | Prometheus exposition |

## Metrics

```text
pulsegrid_alerting_samples_evaluated_total          counter
pulsegrid_alerting_rule_fired_total{rule="..."}     counter, one series per rule
pulsegrid_alerting_active_alerts                    gauge
```

Every rule is emitted even at zero, so a rule that has never fired is visibly
zero rather than a missing series.

## Scaling

The dedupe window lives in memory, so replicas would double-count. The
Kubernetes manifest pins the deployment to one replica; to scale, shard devices
across instances rather than adding replicas behind one service.
