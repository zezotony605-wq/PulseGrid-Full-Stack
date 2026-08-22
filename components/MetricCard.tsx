import { linePoints } from "@/lib/telemetry";

export type MetricCardProps = {
  label: string;
  value: string | number;
  unit: string;
  tone: string;
  spark: readonly number[];
  live: boolean;
};

/** Gradient ids end up in `url(#...)`, so keep them to a safe character set. */
function gradientId(label: string): string {
  return `spark-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function MetricCard({ label, value, unit, tone, spark, live }: MetricCardProps) {
  const id = gradientId(label);
  const points = linePoints(spark, 160, 40);

  return (
    <article className="metric-card">
      <div className="metric-label">
        <span className="metric-dot" style={{ background: tone }} />
        {label}
        <span className="live-pill">{live ? "LIVE" : "DEMO"}</span>
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <svg className="sparkline" viewBox="0 0 160 48" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={tone} stopOpacity=".35" />
            <stop offset="1" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,48 ${points} 160,48`} fill={`url(#${id})`} />
        <polyline
          points={points}
          fill="none"
          stroke={tone}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </article>
  );
}
