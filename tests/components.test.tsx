import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventsPanel } from "@/components/EventsPanel";
import { FleetPanel } from "@/components/FleetPanel";
import { HeartRatePanel } from "@/components/HeartRatePanel";
import { MetricCard } from "@/components/MetricCard";
import { StatusStrip } from "@/components/StatusStrip";
import type { TelemetryReading } from "@/lib/types";

const reading = (overrides: Partial<TelemetryReading> = {}): TelemetryReading => ({
  eventId: "event-1",
  deviceId: "PG-A7F2",
  timestamp: "2026-03-14T10:42:38.491Z",
  heartRate: 86,
  speedKmh: 12.4,
  systolicPressure: 121,
  diastolicPressure: 78,
  oxygenPercent: 98,
  latitude: 30.0444,
  longitude: 31.2357,
  ...overrides,
});

describe("MetricCard", () => {
  it("labels the source so synthetic data is never mistaken for live data", () => {
    const { rerender } = render(
      <MetricCard label="HEART RATE" value={86} unit="bpm" tone="#ff5277" spark={[80, 84, 86]} live />,
    );
    expect(screen.getByText("LIVE")).toBeInTheDocument();

    rerender(
      <MetricCard label="HEART RATE" value={86} unit="bpm" tone="#ff5277" spark={[80, 84, 86]} live={false} />,
    );
    expect(screen.getByText("DEMO")).toBeInTheDocument();
  });
});

describe("StatusStrip", () => {
  it("says the gateway is offline when there are no stats", () => {
    render(<StatusStrip stats={null} live={false} />);
    expect(screen.getByText(/gateway offline/i)).toBeInTheDocument();
  });

  it("renders the aggregate window when the gateway responds", () => {
    render(
      <StatusStrip
        live
        stats={{
          events: 18429,
          devices: 2847,
          avgHeartRate: 84.4,
          minHeartRate: 61,
          maxHeartRate: 132,
          avgOxygenPercent: 97.2,
          windowMinutes: 15,
        }}
      />,
    );
    expect(screen.getByText("18,429")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
    expect(screen.getByText(/last 15 minutes/i)).toBeInTheDocument();
  });
});

describe("EventsPanel", () => {
  it("shows a placeholder row before the first event arrives", () => {
    render(<EventsPanel readings={[]} />);
    expect(screen.getByText(/waiting for the first event/i)).toBeInTheDocument();
  });

  it("tags each row with the severity derived from the reading", () => {
    render(
      <EventsPanel
        readings={[
          reading({ eventId: "a" }),
          reading({ eventId: "b", oxygenPercent: 88 }),
          reading({ eventId: "c", systolicPressure: 134 }),
        ]}
      />,
    );
    expect(screen.getByText("NORMAL")).toBeInTheDocument();
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText("WARNING")).toBeInTheDocument();
  });
});

describe("FleetPanel", () => {
  it("derives the online share from the fleet counts", () => {
    render(<FleetPanel fleet={{ total: 1000, online: 950, degraded: 30, offline: 20 }} />);
    expect(screen.getByText("95.0%")).toBeInTheDocument();
  });

  it("does not divide by zero on an empty fleet", () => {
    render(<FleetPanel fleet={{ total: 0, online: 0, degraded: 0, offline: 0 }} />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});

describe("HeartRatePanel", () => {
  it("summarises the series in the footer", () => {
    const { container } = render(
      <HeartRatePanel series={[70, 80, 90]} deviceId="PG-A7F2" paused={false} onTogglePause={() => {}} />,
    );
    // Scoped to the footer: the y-axis labels reuse the same numbers.
    const footer = within(container.querySelector(".chart-footer") as HTMLElement);
    expect(footer.getByText("90 bpm")).toBeInTheDocument();
    expect(footer.getByText("70")).toBeInTheDocument();
    expect(footer.getByText("80")).toBeInTheDocument();
  });

  it("asks the owner to pause the stream", async () => {
    const onTogglePause = vi.fn();
    render(
      <HeartRatePanel series={[70, 80, 90]} deviceId="PG-A7F2" paused={false} onTogglePause={onTogglePause} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /pause stream/i }));
    expect(onTogglePause).toHaveBeenCalledOnce();
  });

  it("marks the selected range tab as pressed", async () => {
    render(
      <HeartRatePanel series={[70, 80, 90]} deviceId="PG-A7F2" paused={false} onTogglePause={() => {}} />,
    );
    const tabs = screen.getByRole("button", { name: "Live" }).parentElement!;
    expect(screen.getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(within(tabs).getByRole("button", { name: "24H" }));
    expect(within(tabs).getByRole("button", { name: "24H" })).toHaveAttribute("aria-pressed", "true");
    expect(within(tabs).getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "false");
  });
});
