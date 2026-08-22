"use client";

import { useMemo, useState } from "react";
import { linePoints, summarise } from "@/lib/telemetry";

const RANGES = ["Live", "1H", "6H", "24H"] as const;

export type HeartRatePanelProps = {
  series: readonly number[];
  deviceId: string;
  paused: boolean;
  onTogglePause: () => void;
};

export function HeartRatePanel({ series, deviceId, paused, onTogglePause }: HeartRatePanelProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("Live");
  const points = useMemo(() => linePoints(series), [series]);
  const stats = useMemo(() => summarise(series), [series]);

  return (
    <article className="panel chart-panel">
      <div className="panel-head">
        <div>
          <h2>Heart rate stream</h2>
          <p>Real-time aggregated signal · Device {deviceId}</p>
        </div>
        <div className="range-tabs">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              className={range === item ? "selected" : ""}
              aria-pressed={range === item}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrap">
        <div className="y-axis">
          <span>110</span>
          <span>90</span>
          <span>70</span>
          <span>50</span>
        </div>
        <svg viewBox="0 0 620 190" preserveAspectRatio="none" role="img" aria-label="Live heart rate chart">
          <defs>
            <linearGradient id="heart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#ff5277" stopOpacity=".28" />
              <stop offset="1" stopColor="#ff5277" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="grid-lines">
            <line x1="0" x2="620" y1="0" y2="0" />
            <line x1="0" x2="620" y1="63" y2="63" />
            <line x1="0" x2="620" y1="126" y2="126" />
            <line x1="0" x2="620" y1="189" y2="189" />
          </g>
          <polygon points={`0,190 ${points} 620,190`} fill="url(#heart-fill)" />
          <polyline points={points} fill="none" stroke="#ff5277" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div className="chart-footer">
        <span>
          <i className="pink" />
          Current <strong>{stats.current} bpm</strong>
        </span>
        <span>
          Min <strong>{stats.min}</strong>
        </span>
        <span>
          Average <strong>{stats.avg}</strong>
        </span>
        <span>
          Max <strong>{stats.max}</strong>
        </span>
        <button type="button" onClick={onTogglePause}>
          {paused ? "▶ Resume stream" : "Ⅱ Pause stream"}
        </button>
      </div>
    </article>
  );
}
