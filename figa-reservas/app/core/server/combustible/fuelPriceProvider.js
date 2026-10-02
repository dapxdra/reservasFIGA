// Precios de combustible RECOPE con tolerancia a fallos.
// RECOPE no responde a los servidores de Vercel (timeout), así que la fuente principal en
// producción es el último precio guardado en Firestore (config/fuelPrices), que se carga
// con `npm run fuel:sync` desde una máquina en Costa Rica.
// Orden: cache en memoria -> Firestore reciente -> RECOPE (con timeout y pausa tras fallar)
// -> Firestore antiguo -> variables FUEL_PRICE_*. Nunca deja colgada la función.

import { db } from "@/app/lib/firebaseadmin.jsx";

const RECOPE_URL = "https://api.recope.go.cr/ventas/precio/consumidor";
const FETCH_TIMEOUT_MS = 4000;
const MEMORY_TTL_MS = 60 * 60 * 1000;
// Un precio guardado hace menos de esto se sirve sin consultar RECOPE.
const FRESH_MS = 24 * 60 * 60 * 1000;
// Tras un fallo de RECOPE no se reintenta por este tiempo (evita esperar el timeout en cada request).
const RECOPE_PAUSE_MS = 30 * 60 * 1000;
const FIRESTORE_DOC = ["config", "fuelPrices"];

const FUEL_PATTERNS = {
  super: /super/i,
  regular: /plus\s*91|regular/i,
  diesel: /di[eé]sel/i,
};

let memoryCache = null;
let recopePausedUntil = 0;

function toNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseRecopeRows(rows) {
  const prices = { super: null, regular: null, diesel: null };
  for (const row of Array.isArray(rows) ? rows : []) {
    const name = String(row?.nomprod || "");
    const total = toNumber(row?.preciototal);
    if (total == null) continue;
    for (const [key, pattern] of Object.entries(FUEL_PATTERNS)) {
      if (prices[key] == null && pattern.test(name)) prices[key] = total;
    }
  }
  return prices;
}

function hasAnyPrice(prices) {
  return Boolean(prices) && Object.keys(FUEL_PATTERNS).some((k) => prices[k] != null);
}

async function fetchFromRecope() {
  const res = await fetch(RECOPE_URL, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": "figa-reservas/1.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`RECOPE respondio ${res.status}`);
  const prices = parseRecopeRows(await res.json());
  if (!hasAnyPrice(prices)) throw new Error("RECOPE sin precios reconocibles");
  return prices;
}

function firestoreRef() {
  if (!db) return null;
  return db.collection(FIRESTORE_DOC[0]).doc(FIRESTORE_DOC[1]);
}

async function readLastKnown() {
  try {
    const ref = firestoreRef();
    if (!ref) return null;
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    const prices = {
      super: toNumber(data.super),
      regular: toNumber(data.regular),
      diesel: toNumber(data.diesel),
    };
    return hasAnyPrice(prices) ? { prices, fetchedAt: data.fetchedAt || null } : null;
  } catch {
    return null;
  }
}

async function saveLastKnown(prices, fetchedAt) {
  try {
    const ref = firestoreRef();
    if (!ref) return;
    await ref.set({ ...prices, fetchedAt, source: "recope" }, { merge: true });
  } catch {
    // Persistir es best-effort; no debe romper la respuesta.
  }
}

function readEnvFallback() {
  const prices = {
    super: toNumber(process.env.FUEL_PRICE_SUPER),
    regular: toNumber(process.env.FUEL_PRICE_REGULAR),
    diesel: toNumber(process.env.FUEL_PRICE_DIESEL),
  };
  return hasAnyPrice(prices) ? prices : null;
}

function remember(result, now, ttlMs = MEMORY_TTL_MS) {
  memoryCache = { result, expiresAt: now + ttlMs };
  return result;
}

/**
 * @returns {Promise<{ prices: {super:number|null, regular:number|null, diesel:number|null},
 *   source: "recope"|"firestore"|"env"|"none", fetchedAt: string|null, stale: boolean }>}
 * stale = el precio no se confirmó con RECOPE en las últimas 24 h.
 */
export async function getFuelPrices({ now = Date.now() } = {}) {
  if (memoryCache && now < memoryCache.expiresAt) return memoryCache.result;

  const lastKnown = await readLastKnown();
  const lastKnownMs = lastKnown?.fetchedAt ? Date.parse(lastKnown.fetchedAt) : NaN;
  if (lastKnown && Number.isFinite(lastKnownMs) && now - lastKnownMs < FRESH_MS) {
    return remember(
      { prices: lastKnown.prices, source: "firestore", fetchedAt: lastKnown.fetchedAt, stale: false },
      now
    );
  }

  if (now >= recopePausedUntil) {
    try {
      const prices = await fetchFromRecope();
      const fetchedAt = new Date(now).toISOString();
      await saveLastKnown(prices, fetchedAt);
      return remember({ prices, source: "recope", fetchedAt, stale: false }, now);
    } catch (err) {
      recopePausedUntil = now + RECOPE_PAUSE_MS;
      console.warn("[fuelPrice] RECOPE no disponible:", err?.message || err);
    }
  }

  if (lastKnown) {
    // Cache corto: si alguien corre fuel:sync, se nota en minutos.
    return remember(
      { prices: lastKnown.prices, source: "firestore", fetchedAt: lastKnown.fetchedAt, stale: true },
      now,
      10 * 60 * 1000
    );
  }

  const envPrices = readEnvFallback();
  if (envPrices) {
    return { prices: envPrices, source: "env", fetchedAt: null, stale: true };
  }

  return { prices: { super: null, regular: null, diesel: null }, source: "none", fetchedAt: null, stale: true };
}

export function __resetFuelPriceCacheForTests({ keepRecopePause = false } = {}) {
  memoryCache = null;
  if (!keepRecopePause) recopePausedUntil = 0;
}
