/** Shapes returned by the Kotlin gateway. Wire format is snake_case. */

export type TelemetryReading = {
  eventId: string;
  deviceId: string;
  timestamp: string;
  heartRate: number;
  speedKmh: number;
  systolicPressure: number;
  diastolicPressure: number;
  oxygenPercent: number;
  latitude: number;
  longitude: number;
};

export type TelemetryStats = {
  events: number;
  devices: number;
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  avgOxygenPercent: number;
  windowMinutes: number;
};

export type FleetSummary = {
  total: number;
  online: number;
  degraded: number;
  offline: number;
};

/** Severity is derived on the client so the UI degrades gracefully offline. */
export type Severity = "normal" | "warning" | "critical";

/** Where the numbers on screen came from. Surfaced in the UI on purpose. */
export type StreamSource = "live" | "demo";

export type ConnectionState = "connecting" | "open" | "closed";
