import { describe, expect, it } from "vitest";
import { estadoTracking, inicioServicioMs, ventanaTracking, ymdEnCR } from "./trackingWindow.js";
import { KNOWN_PLACE_COORDS as K } from "@/app/core/server/shared/knownPlaces.js";

const iso = (s) => Date.parse(s);

function reserva(id, fecha, hora, extra = {}) {
  return { id, fecha, hora, ...extra };
}

describe("inicioServicioMs", () => {
  it("convierte fecha + hora de Costa Rica (UTC-6) a UTC", () => {
    expect(inicioServicioMs(reserva(1, "2026-10-02", "08:00"))).toBe(iso("2026-10-02T14:00:00Z"));
    expect(inicioServicioMs(reserva(1, "2026-10-02", "7:30 PM"))).toBe(iso("2026-10-03T01:30:00Z"));
  });

  it("devuelve null sin hora o con fecha inválida", () => {
    expect(inicioServicioMs(reserva(1, "2026-10-02", ""))).toBeNull();
    expect(inicioServicioMs(reserva(1, "02/10/2026", "08:00"))).toBeNull();
  });
});

describe("ymdEnCR", () => {
  it("usa la fecha de Costa Rica, no la UTC", () => {
    expect(ymdEnCR(iso("2026-10-03T03:00:00Z"))).toBe("2026-10-02");
  });
});

describe("ventanaTracking", () => {
  it("abre 3 h antes y cierra 1 h después del fin estimado por la ruta", () => {
    const v = ventanaTracking(
      reserva(7, "2026-10-02", "08:00", {
        pickUpLat: K.lir.lat,
        pickUpLng: K.lir.lng,
        dropOffLat: K.tamarindo.lat,
        dropOffLng: K.tamarindo.lng,
      })
    );
    expect(v.reservaId).toBe("7");
    expect(v.desdeMs).toBe(iso("2026-10-02T11:00:00Z"));
    // LIR -> Tamarindo ~98 min estimados + 60 min.
    expect(v.hastaMs).toBe(iso("2026-10-02T14:00:00Z") + (98 + 60) * 60_000);
  });

  it("sin ubicaciones usa la duración de respaldo (5 h)", () => {
    const v = ventanaTracking(reserva(8, "2026-10-02", "08:00"));
    expect(v.hastaMs).toBe(iso("2026-10-02T14:00:00Z") + (300 + 60) * 60_000);
  });
});

describe("estadoTracking", () => {
  const manana = reserva("a", "2026-10-02", "08:00"); // ventana 11:00Z - 20:00Z
  const tarde = reserva("b", "2026-10-02", "18:00"); // ventana 21:00Z - 06:00Z(+1)

  it("inactivo antes de la ventana, con el próximo servicio", () => {
    const estado = estadoTracking([tarde, manana], iso("2026-10-02T10:00:00Z"));
    expect(estado).toEqual({
      activo: false,
      proximo: { reservaId: "a", desde: "2026-10-02T11:00:00.000Z" },
    });
  });

  it("activo dentro de la ventana", () => {
    const estado = estadoTracking([manana, tarde], iso("2026-10-02T12:00:00Z"));
    expect(estado).toEqual({
      activo: true,
      reservaId: "a",
      desde: "2026-10-02T11:00:00.000Z",
      hasta: "2026-10-02T20:00:00.000Z",
    });
  });

  it("une la ventana con el siguiente servicio si se solapan", () => {
    const encadenado = reserva("c", "2026-10-02", "13:00"); // ventana 16:00Z - 01:00Z(+1)
    const estado = estadoTracking([manana, encadenado], iso("2026-10-02T12:00:00Z"));
    expect(estado.hasta).toBe("2026-10-03T01:00:00.000Z");
  });

  it("ignora reservas canceladas o sin hora", () => {
    const estado = estadoTracking(
      [{ ...manana, cancelada: true }, reserva("x", "2026-10-02", "")],
      iso("2026-10-02T12:00:00Z")
    );
    expect(estado).toEqual({ activo: false, proximo: null });
  });
});

describe("estadoTracking con estados del servicio", () => {
  const manana = { id: "a", fecha: "2026-10-02", hora: "08:00" }; // ventana 11:00Z - 20:00Z

  it("activa el seguimiento antes de la ventana si el conductor ya salió", () => {
    const estado = estadoTracking([{ ...manana, estadoServicio: "en_camino" }], Date.parse("2026-10-02T09:00:00Z"));
    expect(estado).toMatchObject({ activo: true, reservaId: "a", hasta: "2026-10-02T20:00:00.000Z" });
  });

  it("un servicio finalizado apaga el seguimiento", () => {
    const estado = estadoTracking([{ ...manana, estadoServicio: "finalizada" }], Date.parse("2026-10-02T15:00:00Z"));
    expect(estado).toEqual({ activo: false, proximo: null });
  });
});
