"use client";

import { useEffect, useState } from "react";
import { fetchFleet, fetchStats } from "./api";
import type { FleetSummary, TelemetryStats } from "./types";

const POLL_INTERVAL_MS = 5000;

/** Shown when the gateway is unreachable, alongside a "demo" label in the UI. */
const DEMO_FLEET: FleetSummary = { total: 2847, online: 2784, degraded: 41, offline: 22 };

export type PlatformSummary = {
  stats: TelemetryStats | null;
  fleet: FleetSummary;
  reachable: boolean;
};

/**
 * Polls the gateway's aggregate endpoints. Prometheus already scrapes the same
 * counters, so this is deliberately a plain interval rather than a second
 * streaming channel to keep the socket dedicated to per-event data.
 */
export function usePlatformSummary(): PlatformSummary {
  const [summary, setSummary] = useState<PlatformSummary>({
    stats: null,
    fleet: DEMO_FLEET,
    reachable: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;

    const poll = async () => {
      try {
        const [stats, fleet] = await Promise.all([
          fetchStats(15, controller.signal),
          fetchFleet(controller.signal),
        ]);
        if (!disposed) setSummary({ stats, fleet, reachable: true });
      } catch {
        // Gateway down or still starting: keep the placeholder view.
        if (!disposed) setSummary({ stats: null, fleet: DEMO_FLEET, reachable: false });
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  return summary;
}
