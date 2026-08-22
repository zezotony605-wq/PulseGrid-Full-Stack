import { apiBaseUrl } from "./config";
import type { FleetSummary, TelemetryReading, TelemetryStats } from "./types";
import { parseTelemetryEvent } from "./telemetry";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Every read is time-boxed. The dashboard has a working offline mode, so a
 * gateway that hangs should fall back quickly rather than leave panels empty.
 */
async function getJson<T>(path: string, signal?: AbortSignal, timeoutMs = 4000): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(`GET ${path} failed`, response.status);
  }
  return (await response.json()) as T;
}

export async function fetchRecent(limit = 25, signal?: AbortSignal): Promise<TelemetryReading[]> {
  const payload = await getJson<unknown>(`/api/v1/telemetry/recent?limit=${limit}`, signal);
  if (!Array.isArray(payload)) return [];
  return payload
    .map(parseTelemetryEvent)
    .filter((reading): reading is TelemetryReading => reading !== null);
}

export function fetchStats(windowMinutes = 15, signal?: AbortSignal): Promise<TelemetryStats> {
  return getJson<TelemetryStats>(`/api/v1/telemetry/stats?windowMinutes=${windowMinutes}`, signal);
}

export function fetchFleet(signal?: AbortSignal): Promise<FleetSummary> {
  return getJson<FleetSummary>("/api/v1/devices/summary", signal);
}
