"use client";

import { useMemo } from "react";
import { EventsPanel } from "./EventsPanel";
import { FleetPanel } from "./FleetPanel";
import { HeartRatePanel } from "./HeartRatePanel";
import { MetricCard } from "./MetricCard";
import { PipelinePanel } from "./PipelinePanel";
import { PlatformGrid } from "./PlatformGrid";
import { Sidebar } from "./Sidebar";
import { StatusStrip } from "./StatusStrip";
import { classifyReading } from "@/lib/telemetry";
import { usePlatformSummary } from "@/lib/usePlatformSummary";
import { useTelemetryStream } from "@/lib/useTelemetryStream";

const SPARK_LENGTH = 12;

export function Dashboard() {
  const { reading, series, recent, source, connection, paused, togglePaused } = useTelemetryStream();
  const { stats, fleet, reachable } = usePlatformSummary();

  const live = source === "live";
  const spark = useMemo(() => series.slice(-SPARK_LENGTH), [series]);
  const alertCount = useMemo(
    () => recent.filter((event) => classifyReading(event) !== "normal").length,
    [recent],
  );

  return (
    <main className="app-shell">
      <Sidebar deviceCount={fleet.total} alertCount={alertCount} healthy={live || reachable} />

      <section className="content" id="overview">
        <header className="topbar">
          <div>
            <p>CONTROL CENTER</p>
            <h1>Telemetry overview</h1>
          </div>
          <div className="top-actions">
            <span className="connected">
              <i />
              {live ? "STREAM CONNECTED" : connection === "connecting" ? "CONNECTING…" : "DEMO DATA"}
            </span>
            <button type="button" aria-label="Notifications">
              ♧<b>{alertCount}</b>
            </button>
            <button className="command" type="button">
              ⌘ <span>Quick actions</span>
              <kbd>K</kbd>
            </button>
          </div>
        </header>

        <StatusStrip stats={stats} live={reachable} />

        <section className="metrics-grid" aria-label="Current health telemetry">
          <MetricCard
            label="HEART RATE"
            value={reading?.heartRate ?? "—"}
            unit="bpm"
            tone="#ff5277"
            spark={spark}
            live={live}
          />
          <MetricCard
            label="RUNNING SPEED"
            value={reading?.speedKmh ?? "—"}
            unit="km/h"
            tone="#29b6ff"
            spark={spark.map((value, index) => value - 7 + (index % 3))}
            live={live}
          />
          <MetricCard
            label="BLOOD PRESSURE"
            value={reading ? `${reading.systolicPressure}/${reading.diastolicPressure}` : "—"}
            unit="mmHg"
            tone="#9c7cff"
            spark={spark.map((value) => value + 18)}
            live={live}
          />
          <MetricCard
            label="BLOOD OXYGEN"
            value={reading?.oxygenPercent ?? "—"}
            unit="% SpO₂"
            tone="#35d5ae"
            spark={spark.map((value, index) => value + (index % 4))}
            live={live}
          />
        </section>

        <section className="dashboard-grid">
          <HeartRatePanel
            series={series}
            deviceId={reading?.deviceId ?? "—"}
            paused={paused}
            onTogglePause={togglePaused}
          />
          <FleetPanel fleet={fleet} />
        </section>

        <section className="bottom-grid">
          <EventsPanel readings={recent} />
          <PipelinePanel healthy={live || reachable} />
        </section>

        <PlatformGrid />
      </section>
    </main>
  );
}
