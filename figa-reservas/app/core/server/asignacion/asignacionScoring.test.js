import { describe, expect, it } from "vitest";
import {
  addDaysYmd,
  hasConflict,
  parseHoraToMinutes,
  claveViaje,
  pickConductor,
  servicioDe,
} from "./asignacionScoring.js";
import { KNOWN_PLACE_COORDS as K } from "@/app/core/server/shared/knownPlaces.js";

const FECHA = "2026-10-01";

const conductores = [
  { id: "c1", nombre: "Ana", vehiculoId: "v1" },
  { id: "c2", nombre: "Beto", vehiculoId: "v2" },
];

const vehiculos = [
  { id: "v1", placa: "AAA-111", capacidad: 4, activo: true },
  { id: "v2", placa: "BBB-222", capacidad: 12, activo: true },
];

function agendaOf(entries) {
  const agenda = new Map();
  for (const [id, fecha, minutos, dropOff = ""] of entries) {
    if (!agenda.has(id)) agenda.set(id, new Map());
    const porFecha = agenda.get(id);
    if (!porFecha.has(fecha)) porFecha.set(fecha, []);
    porFecha.get(fecha).push({ minutos, dropOff });
  }
  return agenda;
}

function ctxOf({ conductor = [], vehiculo = [], vehiculosList = vehiculos } = {}) {
  return {
    agendaConductor: agendaOf(conductor),
    agendaVehiculo: agendaOf(vehiculo),
    vehiculosById: new Map(vehiculosList.map((v) => [v.id, v])),
  };
}

describe("parseHoraToMinutes", () => {
  it("interpreta formatos 24h y 12h", () => {
    expect(parseHoraToMinutes("08:30")).toBe(510);
    expect(parseHoraToMinutes("14:05:00")).toBe(845);
    expect(parseHoraToMinutes("2:15 PM")).toBe(855);
    expect(parseHoraToMinutes("12:00 am")).toBe(0);
    expect(parseHoraToMinutes("")).toBeNull();
    expect(parseHoraToMinutes("mañana")).toBeNull();
  });
});

describe("addDaysYmd", () => {
  it("suma días sin desplazar la fecha, cruzando meses", () => {
    expect(addDaysYmd("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysYmd("2026-12-31", 2)).toBe("2027-01-02");
  });
});

describe("hasConflict", () => {
  it("por defecto cada servicio bloquea 5 horas", () => {
    expect(hasConflict([{ minutos: 480 }], 480 + 299)).toBe(true);
    expect(hasConflict([{ minutos: 480 }], 480 + 300)).toBe(false);
    expect(hasConflict([{ minutos: 480 }], 480 - 300)).toBe(false);
  });

  it("un servicio agendado sin hora bloquea el día", () => {
    expect(hasConflict([{ minutos: null }], 900)).toBe(true);
  });
});

describe("pickConductor", () => {
  it("rechaza reservas sin hora", () => {
    const result = pickConductor({ fecha: FECHA, hora: "" }, conductores, ctxOf());
    expect(result).toEqual({ conductor: null, motivo: "SinHora" });
  });

  it("prefiere al conductor con menos servicios y le asigna su vehículo fijo", () => {
    const ctx = ctxOf({ conductor: [["c1", FECHA, 300]] });
    const result = pickConductor({ fecha: FECHA, hora: "12:00" }, conductores, ctx);
    expect(result.conductor.id).toBe("c2");
    expect(result.vehiculo.id).toBe("v2");
    expect(result.asignaVehiculo).toBe(true);
    expect(result.motivo).toBe("MenorCargaDelDia");
  });

  it("descarta conductores con choque de horario (ventana de 5h)", () => {
    const ctx = ctxOf({
      conductor: [
        ["c1", FECHA, 480],
        ["c2", FECHA, 600],
      ],
    });
    const result = pickConductor({ fecha: FECHA, hora: "12:00" }, conductores, ctx);
    expect(result).toEqual({ conductor: null, motivo: "SinConductorDisponible" });
  });

  it("descarta al conductor si su vehículo fijo ya está ocupado", () => {
    const ctx = ctxOf({ vehiculo: [["v2", FECHA, 600]] });
    const result = pickConductor({ fecha: FECHA, hora: "11:00" }, conductores, ctx);
    expect(result.conductor.id).toBe("c1");
    expect(result.vehiculo.id).toBe("v1");
  });

  it("descarta vehículos sin capacidad para AD + NI", () => {
    const result = pickConductor(
      { fecha: FECHA, hora: "09:00", AD: 3, NI: 2 },
      conductores,
      ctxOf()
    );
    expect(result.conductor.id).toBe("c2");

    const lleno = pickConductor(
      { fecha: FECHA, hora: "09:00", AD: 20, NI: 0 },
      conductores,
      ctxOf()
    );
    expect(lleno).toEqual({ conductor: null, motivo: "CapacidadInsuficiente" });
  });

  it("respeta el vehículo elegido a mano en la reserva", () => {
    const result = pickConductor(
      { fecha: FECHA, hora: "09:00", vehiculoId: "v2" },
      [conductores[0]],
      ctxOf()
    );
    expect(result.conductor.id).toBe("c1");
    expect(result.vehiculo.id).toBe("v2");
    expect(result.asignaVehiculo).toBe(false);
  });

  it("no asigna un vehículo fijo inactivo, pero sí al conductor", () => {
    const ctx = ctxOf({
      vehiculosList: [{ id: "v1", placa: "AAA-111", activo: false }],
    });
    const result = pickConductor({ fecha: FECHA, hora: "09:00" }, [conductores[0]], ctx);
    expect(result.conductor.id).toBe("c1");
    expect(result.vehiculo).toBeNull();
    expect(result.asignaVehiculo).toBe(false);
  });

  it("prefiere encadenar si el dropOff anterior coincide con el pickUp", () => {
    const ctx = ctxOf({ conductor: [["c2", FECHA, 360, "Hotel Tamarindo"]] });
    const result = pickConductor(
      { fecha: FECHA, hora: "13:00", pickUp: "hotel tamarindo" },
      conductores,
      ctx
    );
    expect(result.conductor.id).toBe("c2");
    expect(result.motivo).toBe("EncadenaServicio");
  });

  it("respeta el máximo de servicios por día", () => {
    const ctx = ctxOf({
      conductor: [
        ["c1", FECHA, 0],
        ["c2", FECHA, 0],
      ],
    });
    const config = { duracionServicioMin: 60, margenMin: 0, maxServiciosPorDia: 1 };
    const result = pickConductor({ fecha: FECHA, hora: "18:00" }, conductores, ctx, config);
    expect(result.conductor).toBeNull();
  });
});

function reservaEntre(hora, origen, destino, extra = {}) {
  return {
    fecha: FECHA,
    hora,
    pickUpLat: origen.lat,
    pickUpLng: origen.lng,
    dropOffLat: destino.lat,
    dropOffLng: destino.lng,
    ...extra,
  };
}

function ctxConServicios(porConductor) {
  const agendaConductor = new Map();
  for (const [id, reservas] of Object.entries(porConductor)) {
    agendaConductor.set(id, new Map([[FECHA, reservas.map(servicioDe)]]));
  }
  return {
    agendaConductor,
    agendaVehiculo: new Map(),
    vehiculosById: new Map(vehiculos.map((v) => [v.id, v])),
  };
}

describe("servicioDe", () => {
  it("usa lugares conocidos cuando la reserva no trae coordenadas", () => {
    const servicio = servicioDe({ hora: "08:00", pickUp: "Aeropuerto Juan Santamaría", dropOff: "Hotel en Tamarindo" });
    expect(servicio.minutos).toBe(480);
    expect(servicio.origen).toEqual(K.sjo);
    expect(servicio.destino).toEqual(K.tamarindo);
  });
});

describe("pickConductor con tiempos estimados", () => {
  // LIR -> Tamarindo a las 08:00: el conductor queda libre en Tamarindo ~09:38.
  const servicioManana = reservaEntre("08:00", K.lir, K.tamarindo);

  it("encadena una salida cercana al dropoff anterior aunque falten menos de 5h", () => {
    const ctx = ctxConServicios({ c1: [servicioManana] });
    const result = pickConductor(
      reservaEntre("11:00", { lat: K.tamarindo.lat + 0.005, lng: K.tamarindo.lng }, K.lir),
      conductores,
      ctx
    );
    expect(result.conductor.id).toBe("c1");
    expect(result.motivo).toBe("EncadenaServicio");
    expect(result.kmVacio).toBe(1);
    expect(result.esperaMin).toBeGreaterThan(20);
    expect(result.esperaMin).toBeLessThanOrEqual(120);
  });

  it("descarta al conductor si no alcanza a llegar con holgura", () => {
    const ctx = ctxConServicios({ c1: [servicioManana] });
    const result = pickConductor(reservaEntre("09:50", K.tamarindo, K.lir), conductores, ctx);
    expect(result.conductor.id).toBe("c2");
  });

  it("prefiere al conductor con menos km vacío aunque no encadene", () => {
    const ctx = ctxConServicios({ c1: [servicioManana] });
    // c1 sale de Tamarindo (~60 km); c2 saldría del garage en La Fortuna (~145 km).
    const result = pickConductor(reservaEntre("15:00", K.lir, K.tamarindo), conductores, ctx);
    expect(result.conductor.id).toBe("c1");
    expect(result.motivo).toBe("MenorRecorridoVacio");
    expect(result.esperaMin).toBeGreaterThan(120);
  });

  it("revisa que el servicio nuevo termine a tiempo para el siguiente ya agendado", () => {
    const ctx = ctxConServicios({ c1: [reservaEntre("14:00", K.lir, K.tamarindo)] });

    // Fortuna -> LIR (~3h15): saliendo 08:00 llega antes de las 14:00.
    const temprano = pickConductor(reservaEntre("08:00", K.la_fortuna_center, K.lir), [conductores[0]], ctx);
    expect(temprano.conductor.id).toBe("c1");

    // Saliendo 11:00 llegaría ~14:15: choca.
    const tarde = pickConductor(reservaEntre("11:00", K.la_fortuna_center, K.lir), [conductores[0]], ctx);
    expect(tarde).toEqual({ conductor: null, motivo: "SinConductorDisponible" });
  });
});

describe("pickConductor con tiempos reales", () => {
  it("usa el tiempo por carretera cuando lo tiene, aunque la línea recta sea corta", () => {
    // Fortuna -> Monteverde: ~49 min en línea recta, ~157 min rodeando el lago.
    const ctxBase = ctxConServicios({ c1: [reservaEntre("08:00", K.la_fortuna_center, K.monteverde_center)] });
    const siguiente = reservaEntre("10:00", K.monteverde_center, K.la_fortuna_center);

    const estimado = pickConductor(siguiente, [conductores[0]], ctxBase);
    expect(estimado.conductor.id).toBe("c1");

    const ctxReal = {
      ...ctxBase,
      tiempos: new Map([[claveViaje(K.la_fortuna_center, K.monteverde_center), { minutos: 157, km: 112 }]]),
    };
    const real = pickConductor(siguiente, [conductores[0]], ctxReal);
    expect(real).toEqual({ conductor: null, motivo: "SinConductorDisponible" });
  });

  it("reporta los km reales de recorrido vacío", () => {
    const ctx = {
      ...ctxConServicios({ c1: [reservaEntre("08:00", K.lir, K.tamarindo)] }),
      tiempos: new Map([[claveViaje(K.tamarindo, K.flamingo), { minutos: 30, km: 23 }]]),
    };
    const result = pickConductor(reservaEntre("16:00", K.flamingo, K.lir), [conductores[0]], ctx);
    expect(result.kmVacio).toBe(23);
  });
});
