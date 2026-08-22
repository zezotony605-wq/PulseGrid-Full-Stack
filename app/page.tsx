"use client";

import { useEffect, useMemo, useState } from "react";

type Reading = { heartRate: number; speed: number; pressure: number; oxygen: number };
const initialSeries = [72,74,73,76,78,79,77,81,83,82,84,86,85,88,87,89,91,90,88,86,87,85,84,82,83,81,80,82,84,86];

function linePoints(values:number[], width=620, height=190) {
  const min=Math.min(...values)-5, max=Math.max(...values)+5;
  return values.map((value,index)=>`${((index/(values.length-1))*width).toFixed(1)},${(height-((value-min)/(max-min))*height).toFixed(1)}`).join(" ");
}

function MetricCard({label,value,unit,tone,spark}:{label:string;value:string|number;unit:string;tone:string;spark:number[]}) {
  const id=label.replaceAll(" ","");
  return <article className="metric-card">
    <div className="metric-label"><span className="metric-dot" style={{background:tone}}/>{label}<span className="live-pill">LIVE</span></div>
    <div className="metric-value">{value}<span>{unit}</span></div>
    <svg className="sparkline" viewBox="0 0 160 48" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor={tone} stopOpacity=".35"/><stop offset="1" stopColor={tone} stopOpacity="0"/></linearGradient></defs><polygon points={`0,48 ${linePoints(spark,160,40)} 160,48`} fill={`url(#${id})`}/><polyline points={linePoints(spark,160,40)} fill="none" stroke={tone} strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>
  </article>;
}

export default function Home() {
  const [{reading,series},setLiveState]=useState<{reading:Reading;series:number[]}>({reading:{heartRate:86,speed:12.4,pressure:121,oxygen:98},series:initialSeries});
  const [paused,setPaused]=useState(false), [range,setRange]=useState("Live");
  useEffect(()=>{if(paused)return;const timer=window.setInterval(()=>setLiveState(c=>{const next={heartRate:Math.max(72,Math.min(102,c.reading.heartRate+Math.round((Math.random()-.46)*5))),speed:Math.max(8,Math.min(16,+(c.reading.speed+(Math.random()-.5)*.8).toFixed(1))),pressure:Math.max(114,Math.min(132,c.reading.pressure+Math.round((Math.random()-.5)*3))),oxygen:Math.max(95,Math.min(99,c.reading.oxygen+(Math.random()>.78?(Math.random()>.5?1:-1):0)))};return{reading:next,series:[...c.series.slice(1),next.heartRate]}}),1200);return()=>clearInterval(timer)},[paused]);
  useEffect(()=>{const url=process.env.NEXT_PUBLIC_WS_URL;if(!url)return;const socket=new WebSocket(url);socket.onmessage=({data})=>{try{const event=JSON.parse(data);const next={heartRate:event.heart_rate,speed:event.speed_kmh,pressure:event.systolic_pressure,oxygen:event.oxygen_percent};setLiveState(c=>({reading:next,series:[...c.series.slice(1),next.heartRate]}))}catch{/* Keep the last valid reading when a frame is malformed. */}};return()=>socket.close()},[]);
  const points=useMemo(()=>linePoints(series),[series]), spark=series.slice(-12);
  return <main className="app-shell">
    <aside className="sidebar"><a className="brand" href="#"><span className="brand-mark"><i/><i/><i/></span><span>PulseGrid<small>TELEMETRY</small></span></a>
      <nav aria-label="Primary navigation"><p>Workspace</p><a className="active" href="#overview"><span>⌁</span>Overview</a><a href="#devices"><span>⌬</span>Devices <b>2,847</b></a><a href="#streams"><span>≋</span>Live streams</a><p>Intelligence</p><a href="#analytics"><span>⌁</span>Analytics</a><a href="#alerts"><span>◇</span>Alerts <b className="warning">3</b></a><a href="#reports"><span>▤</span>Reports</a><p>System</p><a href="#api"><span>⌘</span>API & ingestion</a><a href="#settings"><span>⚙</span>Settings</a></nav>
      <div className="system-card"><span className="pulse"/><div><strong>All systems operational</strong><small>Last checked 12s ago</small></div></div><div className="profile"><span>YT</span><div><strong>Yazeed Tony</strong><small>System administrator</small></div><button aria-label="Profile menu">•••</button></div>
    </aside>
    <section className="content" id="overview">
      <header className="topbar"><div><p>CONTROL CENTER</p><h1>Telemetry overview</h1></div><div className="top-actions"><span className="connected"><i/>STREAM CONNECTED</span><button aria-label="Notifications">♧<b>3</b></button><button className="command">⌘ <span>Quick actions</span><kbd>K</kbd></button></div></header>
      <div className="status-strip"><div><span className="pulse"/><strong>Live ingestion active</strong><small>Data is flowing normally across all regions</small></div><dl><div><dt>EVENTS / SEC</dt><dd>18,429</dd></div><div><dt>P99 LATENCY</dt><dd>38 <small>ms</small></dd></div><div><dt>UPTIME</dt><dd>99.99%</dd></div></dl></div>
      <section className="metrics-grid" aria-label="Current health telemetry"><MetricCard label="HEART RATE" value={reading.heartRate} unit="bpm" tone="#ff5277" spark={spark}/><MetricCard label="RUNNING SPEED" value={reading.speed} unit="km/h" tone="#29b6ff" spark={spark.map((v,i)=>v-7+i%3)}/><MetricCard label="BLOOD PRESSURE" value={`${reading.pressure}/78`} unit="mmHg" tone="#9c7cff" spark={spark.map(v=>v+18)}/><MetricCard label="BLOOD OXYGEN" value={reading.oxygen} unit="% SpO₂" tone="#35d5ae" spark={spark.map((v,i)=>v+i%4)}/></section>
      <section className="dashboard-grid">
        <article className="panel chart-panel"><div className="panel-head"><div><h2>Heart rate stream</h2><p>Real-time aggregated signal · Device PG-A7F2</p></div><div className="range-tabs">{["Live","1H","6H","24H"].map(item=><button key={item} className={range===item?"selected":""} onClick={()=>setRange(item)}>{item}</button>)}</div></div><div className="chart-wrap"><div className="y-axis"><span>110</span><span>90</span><span>70</span><span>50</span></div><svg viewBox="0 0 620 190" preserveAspectRatio="none" role="img" aria-label="Live heart rate chart"><defs><linearGradient id="heart-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ff5277" stopOpacity=".28"/><stop offset="1" stopColor="#ff5277" stopOpacity="0"/></linearGradient></defs><g className="grid-lines"><line x1="0" x2="620" y1="0" y2="0"/><line x1="0" x2="620" y1="63" y2="63"/><line x1="0" x2="620" y1="126" y2="126"/><line x1="0" x2="620" y1="189" y2="189"/></g><polygon points={`0,190 ${points} 620,190`} fill="url(#heart-fill)"/><polyline points={points} fill="none" stroke="#ff5277" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div className="x-axis"><span>10:42:00</span><span>10:42:15</span><span>10:42:30</span><span>Now</span></div></div><div className="chart-footer"><span><i className="pink"/>Current <strong>{reading.heartRate} bpm</strong></span><span>Min <strong>72</strong></span><span>Average <strong>84</strong></span><span>Max <strong>102</strong></span><button onClick={()=>setPaused(!paused)}>{paused?"▶ Resume stream":"Ⅱ Pause stream"}</button></div></article>
        <article className="panel device-panel" id="devices"><div className="panel-head"><div><h2>Device fleet</h2><p>Live connection health</p></div><button>View all →</button></div><div className="donut-row"><div className="donut"><span><strong>97.8%</strong><small>ONLINE</small></span></div><div className="legend"><p><i className="green"/><span>Online</span><strong>2,784</strong></p><p><i className="yellow"/><span>Degraded</span><strong>41</strong></p><p><i className="muted"/><span>Offline</span><strong>22</strong></p></div></div><div className="region-list"><p><span><i/>Europe West</span><strong>1,204 <small>devices</small></strong></p><p><span><i/>US East</span><strong>846 <small>devices</small></strong></p><p><span><i/>Middle East</span><strong>797 <small>devices</small></strong></p></div></article>
      </section>
      <section className="bottom-grid"><article className="panel events-panel"><div className="panel-head"><div><h2>Recent events</h2><p>Latest signals from the ingestion pipeline</p></div><button>Open event log →</button></div><div className="event-table"><div className="event-row table-head"><span>TIME</span><span>DEVICE</span><span>EVENT</span><span>VALUE</span><span>STATUS</span></div>{[["10:42:38.491","PG-A7F2","heart_rate",`${reading.heartRate} bpm`,"NORMAL"],["10:42:38.306","PG-C109","blood_oxygen","94% SpO₂","WARNING"],["10:42:38.122","PG-88BE","running_speed",`${reading.speed} km/h`,"NORMAL"],["10:42:37.887","PG-2DF1","systolic_pressure","148 mmHg","CRITICAL"]].map(row=><div className="event-row" key={row[1]}>{row.map((cell,i)=><span key={i} className={i===4?`tag ${cell.toLowerCase()}`:""}>{cell}</span>)}</div>)}</div></article>
        <article className="panel pipeline-panel"><div className="panel-head"><div><h2>Ingestion pipeline</h2><p>Secured, buffered & observable</p></div><span className="live-pill">HEALTHY</span></div><div className="pipeline"><div><span className="service-icon">C++</span><p><strong>JWT device gateway</strong><small>Authenticated producers</small></p><em>JWT</em></div><i/><div><span className="service-icon kafka">Kƒ</span><p><strong>Apache Kafka</strong><small>6-partition telemetry topic</small></p><em>BUFFERED</em></div><i/><div><span className="service-icon kotlin">K</span><p><strong>Kotlin consumers</strong><small>3 concurrent workers</small></p><em>ASYNC</em></div><i/><div><span className="service-icon db">CH</span><p><strong>ClickHouse + PostgreSQL</strong><small>Telemetry & audit storage</small></p><em>DUAL</em></div></div></article></section>
      <section className="platform-grid" id="api" aria-label="Platform capabilities">
        <article className="platform-card"><span>PR</span><div><strong>Prometheus</strong><small>CPU · Memory · RPS · p95/p99</small></div><b>SCRAPING</b></article>
        <article className="platform-card"><span className="grafana">G</span><div><strong>Grafana</strong><small>Provisioned health dashboards</small></div><b>5S REFRESH</b></article>
        <article className="platform-card"><span className="security">✓</span><div><strong>API Security</strong><small>JWT scopes · Spring Security</small></div><b>ENFORCED</b></article>
        <article className="platform-card"><span className="swagger">{ }</span><div><strong>OpenAPI</strong><small>Swagger UI · versioned contracts</small></div><b>V1</b></article>
      </section>
    </section>
  </main>;
}
