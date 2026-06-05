const DEV_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.[0-9.]+|10\.0\.2\.2)(:[0-9]+)?$/;

export type CorsOriginValue =
  | boolean
  | string
  | RegExp
  | (string | RegExp)[];

/**
 * Resolve the allowed origin list for HTTP and WebSocket CORS.
 *
 * - In production: only origins listed in `ALLOWED_ORIGINS` (HTTP) or
 *   `ALLOWED_WS_ORIGINS` (WebSocket) env vars are accepted. Empty/missing
 *   value falls back to a single deny-all sentinel so the surface is closed.
 * - In dev/test: localhost + 192.168.x.x + Android emulator host are allowed
 *   for any port. This matches the previous dev convenience without leaving
 *   prod open.
 */
export function resolveCorsOrigins(envVarName: string): CorsOriginValue {
  const isProd = process.env.NODE_ENV === "production";
  const raw = process.env[envVarName]?.trim();

  if (raw) {
    return raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (isProd) {
    // Closed by default in prod when no list is configured.
    return ["https://invalid.example"];
  }

  return DEV_ORIGIN_PATTERN;
}
