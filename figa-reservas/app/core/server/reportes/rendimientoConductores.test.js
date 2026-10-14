import { describe, expect, it } from "vitest";
import {
  analizarServicio,
  calcularRendimientoConductores,
} from "./rendimientoConductores.js";

// 2026-10-14 12:00 en Costa Rica (UTC-6).
const NOW = Date.parse("2026-10-14T18:00:00Z");
const HOY = "2026-10-14";

const conductores = [
  { id: "c1", uid: "u1", nombre: "Ana", activo: true },
  { id: "c2", uid: "u2", nombre: "Luis", activo: true },
  { id: "c3", uid: "u3", nombre: "Pedro", activo: true },
  { id: "c4", uid: "u4", nombre: "Inactivo", activo: false },
];

const reservas = [
  {
    // 08:00 CR = 14:00Z. Llega 3 min tarde (dentro de tolerancia), todas las etapas.
    id: "A",
    fecha: "2026-10-10",
    hora: "08:00",
    conductorId: "c1",
    AD: 2,
    NI: 1,
    precio: 50,
    estadoServicio: "finalizada",
    estadoServicioAt: {
      confirmada: "2026-10-09T10:00:00Z",
      en_camino: "2026-10-10T13:30:00Z",
      en_pickup: "2026-10-10T14:03:00Z",
      a_bordo: "2026-10-10T14:10:00Z",
      finalizada: "2026-10-10T15:10:00Z",
    },
  },
  {
    // Asignada solo por uid. 09:00 CR = 15:00Z, llega 20 min tarde y nunca finaliza.
    id: "B",
    fecha: "2026-10-11",
    hora: "09:00",
    assignedUid: "u1",
    AD: 4,
    precio: 70,
    estadoServicio: "a_bordo",
    estadoServicioAt: {
      confirmada: "2026-10-10T10:00:00Z",
      en_camino: "2026-10-11T14:40:00Z",
      en_pickup: "2026-10-11T15:20:00Z",
      a_bordo: "2026-10-11T15:25:00Z",
    },
  },
  { id: "C", fecha: "2026-10-12", hora: "10:00", conductorId: "c1", cancelada: true, precio: 99 },
  { id: "D", fecha: "2026-10-20", hora: "10:00", conductorId: "c1", precio: 40 },
  { id: "E", fecha: "2026-10-12", hora: "10:00", precio: 10 },
  // Asignada solo por nombre, sin confirmar.
  { id: "F", fecha: "2026-10-12", hora: "07:00", chofer: " LUIS ", AD: 1, precio: 30 },
];

describe("analizarServicio", () => {
  it("marca como programado un servicio futuro y como realizado uno vencido", () => {
    const futuro = analizarServicio(reservas[3], { nowMs: NOW, hoy: HOY });
    expect(futuro).toMatchObject({ realizada: false, sinCerrar: false });

    const vencido = analizarServicio(reservas[5], { nowMs: NOW, hoy: HOY });
    expect(vencido).toMatchObject({ realizada: true, sinCerrar: true, confirmada: false });
  });

  it("aplica la tolerancia configurada a la llegada al pickup", () => {
    const base = { nowMs: NOW, hoy: HOY };
    expect(analizarServicio(reservas[0], base)).toMatchObject({ retrasoMin: 3, aTiempo: true });
    expect(
      analizarServicio(reservas[0], { ...base, config: { toleranciaMin: 2 } })
    ).toMatchObject({ retrasoMin: 3, aTiempo: false });
  });

  it("descarta intervalos negativos o fuera de rango", () => {
    const s = analizarServicio(
      {
        fecha: "2026-10-10",
        hora: "08:00",
        estadoServicio: "finalizada",
        estadoServicioAt: {
          en_camino: "2026-10-10T15:00:00Z",
          en_pickup: "2026-10-10T14:00:00Z",
          a_bordo: "2026-10-10T14:00:00Z",
          finalizada: "2026-10-11T14:00:00Z",
        },
      },
      { nowMs: NOW, hoy: HOY }
    );
    expect(s.trayectoPickupMin).toBeNull();
    expect(s.duracionViajeMin).toBeNull();
    expect(s.etapasCompletas).toBe(false);
  });
});

describe("calcularRendimientoConductores", () => {
  const resultado = calcularRendimientoConductores({
    reservas,
    conductores,
    nowMs: NOW,
    hoy: HOY,
    incluirSinServicios: true,
  });
  const porNombre = Object.fromEntries(resultado.porConductor.map((c) => [c.nombre, c]));

  it("agrupa por conductorId, uid y nombre, y calcula el resumen del conductor", () => {
    const ana = porNombre.Ana;
    expect(ana).toMatchObject({
      conductorId: "c1",
      activo: true,
      asignados: 4,
      cancelados: 1,
      programados: 1,
      realizados: 2,
      finalizados: 1,
      sinCerrar: 1,
      pasajeros: 7,
      ingresos: 120,
      cumplimiento: { confirmacionPct: 100, finalizacionPct: 50, etapasCompletasPct: 100 },
      puntualidad: { medidas: 2, aTiempo: 1, tarde: 1, aTiempoPct: 50, retrasoPromedioMin: 11.5 },
      tiempos: {
        trayectoPickupPromedioMin: 36.5,
        esperaPickupPromedioMin: 6,
        duracionViajePromedioMin: 60,
      },
    });
    expect(ana.servicios.map((s) => s.id)).toEqual(["A", "B", "C", "D"]);
    expect(ana.servicios[1]).toMatchObject({ retrasoMin: 20, sinCerrar: true });
  });

  it("devuelve null en métricas sin datos en vez de 0", () => {
    expect(porNombre.Luis).toMatchObject({
      realizados: 1,
      cumplimiento: { confirmacionPct: 0, finalizacionPct: 0, etapasCompletasPct: null },
      puntualidad: { medidas: 0, aTiempoPct: null, retrasoPromedioMin: null },
    });
  });

  it("incluye conductores activos sin servicios y omite los inactivos", () => {
    expect(porNombre.Pedro).toMatchObject({ asignados: 0, realizados: 0 });
    expect(porNombre.Inactivo).toBeUndefined();
  });

  it("ordena por servicios realizados y agrega los totales", () => {
    expect(resultado.porConductor.map((c) => c.nombre)).toEqual(["Ana", "Luis", "Pedro"]);
    expect(resultado.totales).toMatchObject({
      conductores: 3,
      sinAsignar: 1,
      asignados: 5,
      realizados: 3,
      finalizados: 1,
      ingresos: 150,
    });
  });

  it("agrupa por nombre a conductores que no están en el catálogo", () => {
    const { porConductor } = calcularRendimientoConductores({
      reservas: [{ id: "X", fecha: "2026-10-12", hora: "07:00", chofer: "Externo" }],
      conductores: [],
      nowMs: NOW,
      hoy: HOY,
    });
    expect(porConductor).toEqual([
      expect.objectContaining({ conductorId: null, nombre: "Externo", activo: null, realizados: 1 }),
    ]);
  });
});
