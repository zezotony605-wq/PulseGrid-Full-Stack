import { formatCount } from "@/lib/telemetry";

export type SidebarProps = { deviceCount: number; alertCount: number; healthy: boolean };

export function Sidebar({ deviceCount, alertCount, healthy }: SidebarProps) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#overview">
        <span className="brand-mark">
          <i />
          <i />
          <i />
        </span>
        <span>
          PulseGrid<small>TELEMETRY</small>
        </span>
      </a>

      <nav aria-label="Primary navigation">
        <p>Workspace</p>
        <a className="active" href="#overview">
          <span aria-hidden="true">⌁</span>Overview
        </a>
        <a href="#devices">
          <span aria-hidden="true">⌬</span>Devices <b>{formatCount(deviceCount)}</b>
        </a>
        <a href="#events">
          <span aria-hidden="true">≋</span>Live streams
        </a>
        <p>Intelligence</p>
        <a href="#pipeline">
          <span aria-hidden="true">⌁</span>Pipeline
        </a>
        <a href="#events">
          <span aria-hidden="true">◇</span>Alerts <b className={alertCount > 0 ? "warning" : ""}>{alertCount}</b>
        </a>
        <p>System</p>
        <a href="#platform">
          <span aria-hidden="true">⌘</span>API &amp; ingestion
        </a>
      </nav>

      <div className="system-card">
        <span className="pulse" />
        <div>
          <strong>{healthy ? "All systems operational" : "Gateway unreachable"}</strong>
          <small>{healthy ? "Data is flowing from the gateway" : "Showing synthetic sample data"}</small>
        </div>
      </div>

      <div className="profile">
        <span>YT</span>
        <div>
          <strong>Yazeed Tony</strong>
          <small>System administrator</small>
        </div>
        <button aria-label="Profile menu">•••</button>
      </div>
    </aside>
  );
}
