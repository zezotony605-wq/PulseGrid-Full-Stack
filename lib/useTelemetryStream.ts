"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamUrl } from "./config";
import { createDemoGenerator, demoSeries } from "./demo";
import { parseTelemetryEvent, pushSample } from "./telemetry";
import type { ConnectionState, StreamSource, TelemetryReading } from "./types";

const SERIES_CAPACITY = 30;
const RECENT_CAPACITY = 6;
const DEMO_INTERVAL_MS = 1200;

/**
 * Full jitter exponential backoff, capped at 15s. Exported so the schedule is
 * covered by tests instead of only being exercised by a flaky live socket.
 */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(15_000, 500 * 2 ** Math.max(0, attempt));
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}

export type TelemetryStreamState = {
  reading: TelemetryReading | null;
  series: number[];
  recent: TelemetryReading[];
  source: StreamSource;
  connection: ConnectionState;
  paused: boolean;
  togglePaused: () => void;
};

/**
 * Subscribes to the gateway's telemetry socket and keeps a bounded rolling
 * window. When the socket is unreachable it falls back to the synthetic
 * generator and reports `source: "demo"` so the UI can say so.
 */
export function useTelemetryStream(): TelemetryStreamState {
  const [reading, setReading] = useState<TelemetryReading | null>(null);
  const [series, setSeries] = useState<number[]>(() => demoSeries(SERIES_CAPACITY));
  const [recent, setRecent] = useState<TelemetryReading[]>([]);
  const [source, setSource] = useState<StreamSource>("demo");
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [paused, setPaused] = useState(false);

  // The socket and interval callbacks are long-lived, so they read `paused`
  // through a ref rather than being torn down and rebuilt on every toggle.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const accept = useCallback((next: TelemetryReading) => {
    if (pausedRef.current) return;
    setReading(next);
    setSeries((current) => pushSample(current, next.heartRate, SERIES_CAPACITY));
    setRecent((current) => [next, ...current].slice(0, RECENT_CAPACITY));
  }, []);

  // Live socket, with reconnect. Kept separate from the demo timer below so a
  // socket that recovers mid-session simply takes over.
  useEffect(() => {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return;

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setConnection("connecting");

      try {
        socket = new WebSocket(streamUrl());
      } catch {
        scheduleRetry();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
        setConnection("open");
        setSource("live");
      };

      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        let payload: unknown;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return; // Keep the last good reading when a frame is malformed.
        }
        const next = parseTelemetryEvent(payload);
        if (next) accept(next);
      };

      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        setConnection("closed");
        setSource("demo");
        scheduleRetry();
      };
    };

    const scheduleRetry = () => {
      if (disposed) return;
      retryTimer = setTimeout(connect, backoffDelay(attempt));
      attempt += 1;
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      if (socket) {
        socket.onclose = null; // Unmount must not schedule another retry.
        socket.close();
      }
    };
  }, [accept]);

  // Synthetic samples while the socket is not delivering. The walk is carried
  // in a local rather than read out of a state updater: updaters have to stay
  // pure, and StrictMode double-invokes them, which would emit every sample
  // twice.
  useEffect(() => {
    if (source === "live") return;
    const generate = createDemoGenerator();
    const timer = setInterval(() => accept(generate()), DEMO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [source, accept]);

  const togglePaused = useCallback(() => setPaused((value) => !value), []);

  return { reading, series, recent, source, connection, paused, togglePaused };
}
