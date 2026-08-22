/**
 * The dashboard is a static client bundle, so both URLs have to be baked in at
 * build time. Defaults point at the docker-compose gateway.
 */
const DEFAULT_API_URL = "http://localhost:8080";

export function apiBaseUrl(): string {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);
}

/**
 * Derive the socket URL from the API URL unless it is set explicitly, so a
 * single env var is enough for the common deployment.
 */
export function streamUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit;
  const base = apiBaseUrl();
  return `${base.replace(/^http/, "ws")}/ws/telemetry`;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
