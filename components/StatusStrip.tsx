import { formatCount } from "@/lib/telemetry";
import type { TelemetryStats } from "@/lib/types";

export type StatusStripProps = { stats: TelemetryStats | null; live: boolean };

export function StatusStrip({ stats, live }: StatusStripProps) {
  return (
    <div className="status-strip">
      <div>
        <span className="pulse" />
        <strong>{live ? "Live ingestion active" : "Sample data — gateway offline"}</strong>
        <small>
          {live
            ? `Aggregated over the last ${stats?.windowMinutes ?? 15} minutes`
            : "Start the platform with docker compose up to see real telemetry"}
        </small>
      </div>
      <dl>
        <div>
          <dt>EVENTS</dt>
          <dd>{stats ? formatCount(stats.events) : "—"}</dd>
        </div>
        <div>
          <dt>DEVICES</dt>
          <dd>{stats ? formatCount(stats.devices) : "—"}</dd>
        </div>
        <div>
          <dt>AVG HR</dt>
          <dd>
            {stats ? Math.round(stats.avgHeartRate) : "—"} <small>bpm</small>
          </dd>
        </div>
      </dl>
    </div>
  );
}
