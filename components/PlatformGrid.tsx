const CAPABILITIES = [
  { badge: "PR", cls: "", title: "Prometheus", detail: "CPU · Memory · RPS · p95/p99", tag: "SCRAPING" },
  { badge: "G", cls: "grafana", title: "Grafana", detail: "Provisioned health dashboards", tag: "5S REFRESH" },
  { badge: "✓", cls: "security", title: "API security", detail: "JWT scopes · Spring Security", tag: "ENFORCED" },
  { badge: "{ }", cls: "swagger", title: "OpenAPI", detail: "Swagger UI · versioned contracts", tag: "V1" },
] as const;

export function PlatformGrid() {
  return (
    <section className="platform-grid" id="platform" aria-label="Platform capabilities">
      {CAPABILITIES.map((item) => (
        <article className="platform-card" key={item.title}>
          <span className={item.cls}>{item.badge}</span>
          <div>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </div>
          <b>{item.tag}</b>
        </article>
      ))}
    </section>
  );
}
