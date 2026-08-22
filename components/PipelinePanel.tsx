const STAGES = [
  { badge: "C++", cls: "", title: "JWT device gateway", detail: "Authenticated producers", tag: "JWT" },
  { badge: "Kƒ", cls: "kafka", title: "Apache Kafka", detail: "6-partition telemetry topic", tag: "BUFFERED" },
  { badge: "K", cls: "kotlin", title: "Kotlin consumers", detail: "3 concurrent workers", tag: "ASYNC" },
  { badge: "Go", cls: "", title: "Alert evaluator", detail: "Rule engine + Prometheus", tag: "RULES" },
  { badge: "CH", cls: "db", title: "ClickHouse + PostgreSQL", detail: "Telemetry & audit storage", tag: "DUAL" },
] as const;

export function PipelinePanel({ healthy }: { healthy: boolean }) {
  return (
    <article className="panel pipeline-panel" id="pipeline">
      <div className="panel-head">
        <div>
          <h2>Ingestion pipeline</h2>
          <p>Secured, buffered &amp; observable</p>
        </div>
        <span className="live-pill">{healthy ? "HEALTHY" : "OFFLINE"}</span>
      </div>
      <div className="pipeline">
        {STAGES.map((stage, index) => (
          <div key={stage.title}>
            {index > 0 && <i />}
            <span className={`service-icon ${stage.cls}`}>{stage.badge}</span>
            <p>
              <strong>{stage.title}</strong>
              <small>{stage.detail}</small>
            </p>
            <em>{stage.tag}</em>
          </div>
        ))}
      </div>
    </article>
  );
}
