import { describe, expect, it } from "vitest";
import { backoffDelay } from "@/lib/useTelemetryStream";
import { createDemoGenerator, createRandom, demoSeries } from "@/lib/demo";

describe("backoffDelay", () => {
  it("grows the ceiling exponentially with the attempt", () => {
    expect(backoffDelay(0, () => 0)).toBe(250);
    expect(backoffDelay(1, () => 0)).toBe(500);
    expect(backoffDelay(2, () => 0)).toBe(1000);
  });

  it("jitters between half the ceiling and the ceiling", () => {
    expect(backoffDelay(3, () => 0)).toBe(2000);
    expect(backoffDelay(3, () => 1)).toBe(4000);
  });

  it("caps the ceiling at fifteen seconds", () => {
    expect(backoffDelay(30, () => 1)).toBe(15_000);
    expect(backoffDelay(30, () => 0)).toBe(7500);
  });

  it("treats a negative attempt as the first one", () => {
    expect(backoffDelay(-5, () => 0)).toBe(250);
  });
});

describe("demo source", () => {
  it("is deterministic for a given seed", () => {
    expect(demoSeries(8, 1234)).toEqual(demoSeries(8, 1234));
  });

  it("produces a different walk for a different seed", () => {
    expect(demoSeries(8, 1)).not.toEqual(demoSeries(8, 2));
  });

  it("keeps every generated sample inside the plausible physiological band", () => {
    const generate = createDemoGenerator(99);
    for (let index = 0; index < 2000; index += 1) {
      const sample = generate();
      expect(sample.heartRate).toBeGreaterThanOrEqual(62);
      expect(sample.heartRate).toBeLessThanOrEqual(124);
      expect(sample.oxygenPercent).toBeGreaterThanOrEqual(91);
      expect(sample.oxygenPercent).toBeLessThanOrEqual(99);
      expect(sample.deviceId).toMatch(/^PG-[A-Z0-9]{4,12}$/);
    }
  });

  it("reverts to the baseline instead of pinning against a clamp", () => {
    // A plain random walk parks on a boundary and stops moving. Over a long
    // run the mean-reverting walk must stay centred and keep varying.
    const generate = createDemoGenerator(2026);
    const samples = Array.from({ length: 4000 }, () => generate().heartRate);
    const tail = samples.slice(-500);
    const mean = tail.reduce((total, value) => total + value, 0) / tail.length;

    expect(mean).toBeGreaterThan(78);
    expect(mean).toBeLessThan(90);
    expect(new Set(tail).size).toBeGreaterThan(8);
  });

  it("draws uniformly in [0, 1)", () => {
    const random = createRandom(7);
    for (let index = 0; index < 1000; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
