// Matriz de tiempos/distancias por carretera con OSRM (/table). Sin Firestore.

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
const MAX_POR_LADO = 50; // fuentes + destinos <= 100 coordenadas por request (límite del demo).
const TIMEOUT_MS = 8000;

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function fetchBloque(fuentes, destinos) {
  const puntos = [...fuentes, ...destinos];
  const coords = puntos.map((p) => `${p.lng},${p.lat}`).join(";");
  const sources = fuentes.map((_, i) => i).join(";");
  const destinations = destinos.map((_, i) => fuentes.length + i).join(";");
  const url =
    `${OSRM_BASE_URL}/table/v1/driving/${coords}` +
    `?sources=${sources}&destinations=${destinations}&annotations=duration,distance`;

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`OSRM respondió ${res.status}`);
  const data = await res.json();
  if (data?.code !== "Ok") throw new Error(`OSRM: ${data?.code || "respuesta inválida"}`);
  return data;
}

/**
 * Tiempos entre cada par (origen, destino) pedido.
 * pares: Array<{ clave, desde: {lat,lng}, hasta: {lat,lng} }>
 * Devuelve { tiempos: Map<clave, { minutos, km }>, error: string|null }.
 * Si una request falla, devuelve lo obtenido hasta ese momento (el resto se estima).
 */
export async function fetchOsrmTiempos(pares) {
  const tiempos = new Map();
  if (pares.length === 0) return { tiempos, error: null };

  // Puntos únicos por lado, para pedir la menor matriz posible.
  const fuentesPorClave = new Map();
  const destinosPorClave = new Map();
  for (const par of pares) {
    fuentesPorClave.set(par.claveDesde, par.desde);
    destinosPorClave.set(par.claveHasta, par.hasta);
  }
  const pedidos = new Set(pares.map((p) => p.clave));
  const clavesFuentes = [...fuentesPorClave.keys()];
  const clavesDestinos = [...destinosPorClave.keys()];

  try {
    for (const bloqueF of chunk(clavesFuentes, MAX_POR_LADO)) {
      for (const bloqueD of chunk(clavesDestinos, MAX_POR_LADO)) {
        const data = await fetchBloque(
          bloqueF.map((k) => fuentesPorClave.get(k)),
          bloqueD.map((k) => destinosPorClave.get(k))
        );
        bloqueF.forEach((kf, i) => {
          bloqueD.forEach((kd, j) => {
            const clave = `${kf}>${kd}`;
            if (!pedidos.has(clave)) return;
            const rawSegundos = data.durations?.[i]?.[j];
            const rawMetros = data.distances?.[i]?.[j];
            // null = OSRM no encontró ruta (p. ej. punto en el mar): se deja para estimar.
            if (rawSegundos == null || rawMetros == null) return;
            const segundos = Number(rawSegundos);
            const metros = Number(rawMetros);
            if (!Number.isFinite(segundos) || !Number.isFinite(metros)) return;
            tiempos.set(clave, {
              minutos: Math.round(segundos / 60),
              km: Math.round((metros / 1000) * 10) / 10,
            });
          });
        });
      }
    }
    return { tiempos, error: null };
  } catch (err) {
    return { tiempos, error: err?.message || String(err) };
  }
}
