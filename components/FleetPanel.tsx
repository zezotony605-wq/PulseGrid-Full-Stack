import { formatCount } from "@/lib/telemetry";
import type { FleetSummary } from "@/lib/types";

export type FleetPanelProps = { fleet: FleetSummary };

export function FleetPanel({ fleet }: FleetPanelProps) {
  const total = Math.max(1, fleet.total);
  const onlineShare = (fleet.online / total) * 100;
  const degradedShare = (fleet.degraded / total) * 100;

  // The donut is a conic gradient, so the segments are cumulative percentages.
  const gradient = `conic-gradient(var(--green) 0 ${onlineShare.toFixed(1)}%, #efb45f ${onlineShare.toFixed(
    1,
  )}% ${(onlineShare + degradedShare).toFixed(1)}%, #393641 ${(onlineShare + degradedShare).toFixed(1)}%)`;

  return (
    <article className="panel device-panel" id="devices">
      <div className="panel-head">
        <div>
          <h2>Device fleet</h2>
          <p>Live connection health</p>
        </div>
      </div>
      <div className="donut-row">
        <div className="donut" style={{ background: gradient }}>
          <span>
            <strong>{onlineShare.toFixed(1)}%</strong>
            <small>ONLINE</small>
          </span>
        </div>
        <div className="legend">
          <p>
            <i className="green" />
            <span>Online</span>
            <strong>{formatCount(fleet.online)}</strong>
          </p>
          <p>
            <i className="yellow" />
            <span>Degraded</span>
            <strong>{formatCount(fleet.degraded)}</strong>
          </p>
          <p>
            <i className="muted" />
            <span>Offline</span>
            <strong>{formatCount(fleet.offline)}</strong>
          </p>
        </div>
      </div>
      <div className="region-list">
        <p>
          <span>
            <i />
            Registered devices
          </span>
          <strong>
            {formatCount(fleet.total)} <small>total</small>
          </strong>
        </p>
      </div>
    </article>
  );
}
