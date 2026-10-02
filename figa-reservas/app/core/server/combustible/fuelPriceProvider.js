// Precios de combustible RECOPE con tolerancia a fallos.
// Orden: cache en memoria -> RECOPE (con timeout) -> ultimo precio guardado en
// Firestore -> variables de entorno FUEL_PRICE_*. Nunca deja colgada la funcion.

import { db } from "@/app/lib/firebaseadmin.jsx";

const RECOPE_URL = "https://api.recope.go.cr/ventas/precio/consumidor";
const FETCH_TIMEOUT_MS = 6000;
const MEMORY_TTL_MS = 60 * 60 * 1000;
const FIRESTORE_DOC = ["config", "fuelPrices"];

const FUEL_PATTERNS = {
  super: /super/i,
  regular: /plus\s*91|regular/i,
  diesel: /di[eé]sel/i,
};

let memoryCache = null;

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

/**
 * @returns {Promise<{ prices: {super:number|null, regular:number|null, diesel:number|null},
 *   source: "recope"|"cache"|"firestore"|"env"|"none", fetchedAt: string|null, stale: boolean }>}
 */
export async function getFuelPrices({ now = Date.now() } = {}) {
  if (memoryCache && now - memoryCache.cachedAt < MEMORY_TTL_MS) {
    return { ...memoryCache.result, source: memoryCache.result.stale ? memoryCache.result.source : "cache" };
  }

  try {
    const prices = await fetchFromRecope();
    const fetchedAt = new Date(now).toISOString();
    await saveLastKnown(prices, fetchedAt);
    const result = { prices, source: "recope", fetchedAt, stale: false };
    memoryCache = { result, cachedAt: now };
    return result;
  } catch (err) {
    console.warn("[fuelPrice] RECOPE no disponible:", err?.message || err);
  }

  const lastKnown = await readLastKnown();
  if (lastKnown) {
    const result = { prices: lastKnown.prices, source: "firestore", fetchedAt: lastKnown.fetchedAt, stale: true };
    // Cache corto para no martillar RECOPE mientras este caido.
    memoryCache = { result, cachedAt: now - MEMORY_TTL_MS + 10 * 60 * 1000 };
    return result;
  }

  const envPrices = readEnvFallback();
  if (envPrices) {
    return { prices: envPrices, source: "env", fetchedAt: null, stale: true };
  }

  return { prices: { super: null, regular: null, diesel: null }, source: "none", fetchedAt: null, stale: true };
}

export function __resetFuelPriceCacheForTests() {
  memoryCache = null;
}
