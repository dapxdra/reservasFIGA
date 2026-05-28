import { jsonResponse } from "@/app/core/shared/http/jsonResponse.js";

const WINDOW_DEFAULT_MS = 60 * 1000;

const buckets = globalThis.__figaRateLimitBuckets || new Map();
if (!globalThis.__figaRateLimitBuckets) {
  globalThis.__figaRateLimitBuckets = buckets;
}

function parseClientIp(req) {
  const fromForwarded = String(req.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0];

  if (fromForwarded) return fromForwarded;

  const fromRealIp = String(req.headers.get("x-real-ip") || "").trim();
  if (fromRealIp) return fromRealIp;

  return "unknown";
}

function cleanupExpired(now) {
  if (buckets.size <= 2000) return;
  for (const [key, value] of buckets) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function buildKey(req, routeKey) {
  const method = String(req.method || "GET").toUpperCase();
  const ip = parseClientIp(req);
  return `${routeKey}:${method}:${ip}`;
}

function getDefaultLimit(method) {
  const readMethods = ["GET", "HEAD", "OPTIONS"];
  return readMethods.includes(method) ? 120 : 40;
}

export function enforceRateLimit(req, options = {}) {
  const now = Date.now();
  cleanupExpired(now);

  const method = String(req.method || "GET").toUpperCase();
  const routeKey = options.routeKey || "api:generic";
  const limit = Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : getDefaultLimit(method);
  const windowMs = Number.isFinite(options.windowMs)
    ? Math.max(1000, Math.floor(options.windowMs))
    : WINDOW_DEFAULT_MS;

  const key = buildKey(req, routeKey);
  const current = buckets.get(key);
  const record = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  record.count += 1;
  buckets.set(key, record);

  if (record.count <= limit) return null;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((record.resetAt - now) / 1000)
  );

  return jsonResponse(
    {
      error: "RateLimitExceeded",
      message: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
    },
    429,
    {
      "Retry-After": String(retryAfterSeconds),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.floor(record.resetAt / 1000)),
    }
  );
}
