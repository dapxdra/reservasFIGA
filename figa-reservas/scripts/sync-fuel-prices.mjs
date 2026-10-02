// Copia los precios de RECOPE a Firestore (config/fuelPrices), que es lo que usa producción.
// RECOPE no responde a los servidores de Vercel, así que esto se corre desde una máquina en
// Costa Rica:  npm run fuel:sync   (usa FIREBASE_SERVICE_ACCOUNT_KEY de .env).
// RECOPE ajusta precios una vez al mes; basta con correrlo tras cada ajuste.

import admin from "firebase-admin";

const RECOPE_URL = "https://api.recope.go.cr/ventas/precio/consumidor";
const FUEL_PATTERNS = {
  super: /super/i,
  regular: /plus\s*91|regular/i,
  diesel: /di[eé]sel/i,
};

function toNumber(value) {
  const n = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function main() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error("Falta FIREBASE_SERVICE_ACCOUNT_KEY (en .env)");

  const res = await fetch(RECOPE_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`RECOPE respondió ${res.status}`);
  const rows = await res.json();

  const prices = { super: null, regular: null, diesel: null };
  for (const row of Array.isArray(rows) ? rows : []) {
    const total = toNumber(row?.preciototal);
    if (total == null) continue;
    for (const [k, pattern] of Object.entries(FUEL_PATTERNS)) {
      if (prices[k] == null && pattern.test(String(row?.nomprod || ""))) prices[k] = total;
    }
  }
  if (Object.values(prices).every((v) => v == null)) {
    throw new Error("RECOPE no devolvió precios reconocibles");
  }

  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(key)) });
  const fetchedAt = new Date().toISOString();
  await admin
    .firestore()
    .collection("config")
    .doc("fuelPrices")
    .set({ ...prices, fetchedAt, source: "recope" }, { merge: true });

  console.log("Precios guardados en config/fuelPrices:", prices, fetchedAt);
}

main().catch((err) => {
  console.error("No se pudieron sincronizar los precios:", err.message);
  process.exit(1);
});
