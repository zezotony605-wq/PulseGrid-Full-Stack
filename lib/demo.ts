import type { TelemetryReading } from "./types";

/**
 * Offline sample source.
 *
 * The dashboard is published as a static demo with no gateway behind it, so it
 * has to keep moving when the WebSocket cannot connect. Everything produced
 * here is synthetic and the UI labels it as such — it must never be mistaken
 * for a device reading.
 */

const DEMO_DEVICES = ["PG-A7F2", "PG-C109", "PG-88BE", "PG-2DF1", "PG-51AC"] as const;

/** Mulberry32: small, seedable, and good enough for a UI placeholder. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type DemoGenerator = () => TelemetryReading;

/** Resting values the walk is pulled back towards. */
const BASELINE = {
  heartRate: 84,
  speedKmh: 12.4,
  systolicPressure: 121,
  diastolicPressure: 78,
  oxygenPercent: 97.4,
};

const REVERSION = 0.12;

/**
 * One Ornstein-Uhlenbeck style step: a random nudge plus a pull back towards
 * the baseline. A plain random walk drifts until it pins against a clamp and
 * then stays there, which reads as a frozen sensor rather than a live one.
 */
function step(current: number, target: number, volatility: number, random: () => number): number {
  return current + (target - current) * REVERSION + (random() - 0.5) * volatility;
}

/**
 * A mean-reverting walk rather than independent samples, so the chart looks
 * like a signal instead of noise.
 */
export function createDemoGenerator(seed = 0x5eed): DemoGenerator {
  const random = createRandom(seed);
  // Carried at full precision: rounding every step would quantise the walk
  // and stall it between whole numbers.
  const state = { ...BASELINE };
  let cursor = 0;

  return () => {
    cursor += 1;

    state.heartRate = clamp(step(state.heartRate, BASELINE.heartRate, 7, random), 62, 124);
    state.speedKmh = clamp(step(state.speedKmh, BASELINE.speedKmh, 1.4, random), 7.5, 16.5);
    state.systolicPressure = clamp(step(state.systolicPressure, BASELINE.systolicPressure, 5, random), 108, 142);
    state.diastolicPressure = clamp(step(state.diastolicPressure, BASELINE.diastolicPressure, 4, random), 64, 94);
    state.oxygenPercent = clamp(step(state.oxygenPercent, BASELINE.oxygenPercent, 2, random), 91, 99.4);

    return {
      eventId: `demo-${cursor}`,
      deviceId: DEMO_DEVICES[cursor % DEMO_DEVICES.length],
      timestamp: new Date().toISOString(),
      heartRate: Math.round(state.heartRate),
      speedKmh: Number(state.speedKmh.toFixed(1)),
      systolicPressure: Math.round(state.systolicPressure),
      diastolicPressure: Math.round(state.diastolicPressure),
      oxygenPercent: Math.round(state.oxygenPercent),
      latitude: 30.0444,
      longitude: 31.2357,
    };
  };
}

/** Seed the chart so the first paint is not an empty panel. */
export function demoSeries(length = 30, seed = 0x5eed): number[] {
  const generate = createDemoGenerator(seed);
  return Array.from({ length }, () => generate().heartRate);
}
