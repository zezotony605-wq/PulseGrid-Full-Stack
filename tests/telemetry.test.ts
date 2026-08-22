import { describe, expect, it } from "vitest";
import {
  classifyReading,
  formatClock,
  formatCount,
  linePoints,
  parseTelemetryEvent,
  pushSample,
  summarise,
} from "@/lib/telemetry";
import type { TelemetryReading } from "@/lib/types";

const wireEvent = {
  event_id: "0f1d2c3b-4a59-4687-9f01-2233445566aa",
  device_id: "PG-A7F2",
  user_id: "00000000-0000-4000-8000-000000000001",
  timestamp: "2026-03-14T10:42:38.491Z",
  heart_rate: 86,
  speed_kmh: 12.4,
  systolic_pressure: 121,
  diastolic_pressure: 78,
  oxygen_percent: 98,
  latitude: 30.0444,
  longitude: 31.2357,
};

const reading: TelemetryReading = parseTelemetryEvent(wireEvent)!;

describe("parseTelemetryEvent", () => {
  it("maps the snake_case wire format onto the client model", () => {
    expect(reading).toMatchObject({
      deviceId: "PG-A7F2",
      heartRate: 86,
      speedKmh: 12.4,
      oxygenPercent: 98,
    });
  });

  it("rejects frames that are not objects", () => {
    expect(parseTelemetryEvent(null)).toBeNull();
    expect(parseTelemetryEvent("PG-A7F2")).toBeNull();
    expect(parseTelemetryEvent(42)).toBeNull();
  });

  it("rejects a frame with a missing or non-numeric measurement", () => {
    const withoutHeartRate: Record<string, unknown> = { ...wireEvent };
    delete withoutHeartRate.heart_rate;
    expect(parseTelemetryEvent(withoutHeartRate)).toBeNull();
    expect(parseTelemetryEvent({ ...wireEvent, oxygen_percent: "98" })).toBeNull();
    expect(parseTelemetryEvent({ ...wireEvent, speed_kmh: Number.NaN })).toBeNull();
  });

  it("rejects a frame without a device id", () => {
    expect(parseTelemetryEvent({ ...wireEvent, device_id: "" })).toBeNull();
  });
});

describe("classifyReading", () => {
  it("treats an in-range reading as normal", () => {
    expect(classifyReading(reading)).toBe("normal");
  });

  it("escalates low oxygen to critical", () => {
    expect(classifyReading({ ...reading, oxygenPercent: 88 })).toBe("critical");
  });

  it("flags borderline hypertension as a warning", () => {
    expect(classifyReading({ ...reading, systolicPressure: 134 })).toBe("warning");
  });

  it("escalates stage-2 hypertension past the warning band", () => {
    expect(classifyReading({ ...reading, systolicPressure: 148 })).toBe("critical");
  });
});

describe("pushSample", () => {
  it("keeps the window bounded and ordered oldest first", () => {
    expect(pushSample([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });

  it("grows until the capacity is reached", () => {
    expect(pushSample([1], 2, 3)).toEqual([1, 2]);
  });

  it("returns an empty window for a non-positive capacity", () => {
    expect(pushSample([1, 2], 3, 0)).toEqual([]);
  });
});

describe("summarise", () => {
  it("reports min, max, rounded mean and the latest sample", () => {
    expect(summarise([70, 80, 91])).toEqual({ min: 70, max: 91, avg: 80, current: 91 });
  });

  it("is safe on an empty series", () => {
    expect(summarise([])).toEqual({ min: 0, max: 0, avg: 0, current: 0 });
  });
});

describe("linePoints", () => {
  it("spans the full width across the series", () => {
    const points = linePoints([70, 80, 90], 100, 50).split(" ");
    expect(points).toHaveLength(3);
    expect(points[0].startsWith("0.0,")).toBe(true);
    expect(points[2].startsWith("100.0,")).toBe(true);
  });

  it("never emits NaN for a flat or single-sample series", () => {
    expect(linePoints([80, 80, 80], 100, 50)).not.toContain("NaN");
    expect(linePoints([80], 100, 50)).toBe("0,25.0");
    expect(linePoints([], 100, 50)).toBe("");
  });
});

describe("formatting", () => {
  it("renders a millisecond wall clock in UTC", () => {
    expect(formatClock("2026-03-14T10:42:38.491Z")).toBe("10:42:38.491");
  });

  it("degrades on an unparseable timestamp", () => {
    expect(formatClock("not-a-date")).toBe("--:--:--");
  });

  it("groups large counts", () => {
    expect(formatCount(18429)).toBe("18,429");
  });
});
