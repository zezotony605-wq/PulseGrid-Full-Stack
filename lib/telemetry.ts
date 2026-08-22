import type { Severity, TelemetryReading } from "./types";

/**
 * Parse one wire event. The gateway serialises snake_case and the WebSocket
 * frame is whatever the broker last produced, so every field is re-checked
 * here rather than trusted through a cast.
 */
export function parseTelemetryEvent(raw: unknown): TelemetryReading | null {
  if (typeof raw !== "object" || raw === null) return null;
  const event = raw as Record<string, unknown>;

  const deviceId = event.device_id;
  const timestamp = event.timestamp;
  if (typeof deviceId !== "string" || deviceId.length === 0) return null;

  const numbers = {
    heartRate: event.heart_rate,
    speedKmh: event.speed_kmh,
    systolicPressure: event.systolic_pressure,
    diastolicPressure: event.diastolic_pressure,
    oxygenPercent: event.oxygen_percent,
    latitude: event.latitude,
    longitude: event.longitude,
  };
  for (const value of Object.values(numbers)) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
  }

  return {
    eventId: typeof event.event_id === "string" ? event.event_id : crypto.randomUUID(),
    deviceId,
    timestamp: typeof timestamp === "string" ? timestamp : new Date().toISOString(),
    heartRate: numbers.heartRate as number,
    speedKmh: numbers.speedKmh as number,
    systolicPressure: numbers.systolicPressure as number,
    diastolicPressure: numbers.diastolicPressure as number,
    oxygenPercent: numbers.oxygenPercent as number,
    latitude: numbers.latitude as number,
    longitude: numbers.longitude as number,
  };
}

/**
 * Triage thresholds for the operator view. These mirror the ranges the Kotlin
 * validator accepts: anything outside them never reaches the dashboard, so the
 * bands here are about drawing attention, not about rejecting data.
 */
export function classifyReading(reading: TelemetryReading): Severity {
  const { heartRate, oxygenPercent, systolicPressure, diastolicPressure } = reading;
  if (oxygenPercent < 90 || systolicPressure >= 140 || heartRate >= 130 || diastolicPressure >= 90) {
    return "critical";
  }
  if (oxygenPercent < 95 || systolicPressure >= 130 || heartRate >= 110) {
    return "warning";
  }
  return "normal";
}

/** Append a sample and keep the window bounded, oldest first. */
export function pushSample(series: readonly number[], value: number, capacity: number): number[] {
  if (capacity <= 0) return [];
  const next = [...series, value];
  return next.length > capacity ? next.slice(next.length - capacity) : next;
}

export type SeriesSummary = { min: number; max: number; avg: number; current: number };

export function summarise(series: readonly number[]): SeriesSummary {
  if (series.length === 0) return { min: 0, max: 0, avg: 0, current: 0 };
  const min = Math.min(...series);
  const max = Math.max(...series);
  const avg = series.reduce((total, value) => total + value, 0) / series.length;
  return { min, max, avg: Math.round(avg), current: series[series.length - 1] };
}

/**
 * Map a series onto SVG polyline coordinates. A flat series would divide by
 * zero on the value range, and a single point has no horizontal span, so both
 * are pinned to the vertical centre instead of producing NaN coordinates.
 */
export function linePoints(values: readonly number[], width = 620, height = 190): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `0,${(height / 2).toFixed(1)}`;

  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const range = max - min;
  const span = values.length - 1;

  return values
    .map((value, index) => {
      const x = (index / span) * width;
      const y = range === 0 ? height / 2 : height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** `10:42:38.491` — the event log is read against a wall clock, not a date. */
export function formatClock(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}
