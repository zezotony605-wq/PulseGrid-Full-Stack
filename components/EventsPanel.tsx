import { classifyReading, formatClock } from "@/lib/telemetry";
import type { TelemetryReading } from "@/lib/types";

export type EventsPanelProps = { readings: readonly TelemetryReading[] };

/** The measurement the operator most likely wants to see for this severity. */
function highlight(reading: TelemetryReading): { metric: string; value: string } {
  if (reading.oxygenPercent < 95) {
    return { metric: "blood_oxygen", value: `${reading.oxygenPercent}% SpO₂` };
  }
  if (reading.systolicPressure >= 130) {
    return { metric: "systolic_pressure", value: `${reading.systolicPressure} mmHg` };
  }
  if (reading.heartRate >= 110) {
    return { metric: "heart_rate", value: `${reading.heartRate} bpm` };
  }
  return { metric: "heart_rate", value: `${reading.heartRate} bpm` };
}

export function EventsPanel({ readings }: EventsPanelProps) {
  return (
    <article className="panel events-panel" id="events">
      <div className="panel-head">
        <div>
          <h2>Recent events</h2>
          <p>Latest signals from the ingestion pipeline</p>
        </div>
      </div>
      <div className="event-table">
        <div className="event-row table-head">
          <span>TIME</span>
          <span>DEVICE</span>
          <span>EVENT</span>
          <span>VALUE</span>
          <span>STATUS</span>
        </div>
        {readings.length === 0 ? (
          <div className="event-row">
            <span>Waiting for the first event…</span>
          </div>
        ) : (
          readings.map((reading) => {
            const severity = classifyReading(reading);
            const { metric, value } = highlight(reading);
            return (
              <div className="event-row" key={reading.eventId}>
                <span>{formatClock(reading.timestamp)}</span>
                <span>{reading.deviceId}</span>
                <span>{metric}</span>
                <span>{value}</span>
                <span className={`tag ${severity}`}>{severity.toUpperCase()}</span>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
