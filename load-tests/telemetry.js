import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const baseUrl=__ENV.BASE_URL||"http://localhost:8080";
const targetRps=Number(__ENV.TARGET_RPS||10000);
const rejected=new Counter("telemetry_rejected");

export const options={
  scenarios:{telemetry_ingestion:{executor:"constant-arrival-rate",rate:targetRps,timeUnit:"1s",duration:__ENV.TEST_DURATION||"30s",preAllocatedVUs:Number(__ENV.PREALLOCATED_VUS||1000),maxVUs:Number(__ENV.MAX_VUS||5000)}},
  thresholds:{http_req_failed:["rate<0.01"],http_req_duration:["p(95)<150","p(99)<250"],telemetry_rejected:["count==0"]},
};

export function setup(){
  const response=http.post(`${baseUrl}/api/v1/auth/device-token`,JSON.stringify({deviceId:"PG-K6LOAD",deviceSecret:__ENV.DEVICE_SECRET||"dev-only-change-me"}),{headers:{"Content-Type":"application/json"}});
  check(response,{"JWT issued":r=>r.status===200});
  return {token:response.json("accessToken")};
}

export default function ingestTelemetry(data){
  const id=String(__VU).padStart(6,"0");
  const payload=JSON.stringify({device_id:`PG-${id}`,user_id:`00000000-0000-4000-8000-${id.padStart(12,"0")}`,timestamp:new Date().toISOString(),heart_rate:72+(__ITER%40),speed_kmh:10.5,systolic_pressure:121,diastolic_pressure:78,oxygen_percent:98,latitude:30.0444,longitude:31.2357});
  const response=http.post(`${baseUrl}/api/v1/telemetry`,payload,{headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.token}`}});
  const ok=check(response,{"accepted by Kafka gateway":r=>r.status===202});if(!ok)rejected.add(1);
}

export function handleSummary(data){return{"/scripts/results/summary.json":JSON.stringify(data,null,2),stdout:`\nPulseGrid load test complete. Inspect load-tests/results/summary.json before publishing any CV throughput claim.\n`};}
