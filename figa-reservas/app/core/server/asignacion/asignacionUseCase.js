import { listConductores } from "@/app/core/server/catalogos/conductoresRepository.js";
import { listVehiculos } from "@/app/core/server/catalogos/vehiculosRepository.js";
import {
  listReservasOrderedByFecha,
  updateReservaById,
} from "@/app/core/server/reservas/reservasRepository.js";
import {
  DEFAULT_ASIGNACION_CONFIG,
  addDaysYmd,
  buscarParejas,
  isReservaPendienteDeAsignar,
  parseHoraToMinutes,
  pickConductor,
  pickConductorPareja,
  servicioDe,
} from "@/app/core/server/asignacion/asignacionScoring.js";
import { cargarTiemposReales } from "@/app/core/server/asignacion/asignacionTiempos.js";
import { appError } from "@/app/core/server/shared/appError.js";
import { getTodayCR } from "@/app/utils/getTodayCR.js";

const MAX_DIAS = 14;

function addToAgenda(agenda, id, reserva) {
  if (!id) return;
  if (!agenda.has(id)) agenda.set(id, new Map());
  const porFecha = agenda.get(id);
  if (!porFecha.has(reserva.fecha)) porFecha.set(reserva.fecha, []);
  porFecha.get(reserva.fecha).push(servicioDe(reserva));
}

function buildAgendas(reservas) {
  const agendaConductor = new Map();
  const agendaVehiculo = new Map();
  for (const reserva of reservas) {
    if (reserva.cancelada || !reserva.fecha) continue;
    addToAgenda(agendaConductor, String(reserva.conductorId || "").trim(), reserva);
    addToAgenda(agendaVehiculo, String(reserva.vehiculoId || "").trim(), reserva);
  }
  return { agendaConductor, agendaVehiculo };
}

// Servicios (asignados o no) de cada día del rango, para pedir sus tiempos reales.
function serviciosPorDiaEnRango(reservas, desde, hasta) {
  const porDia = new Map();
  for (const reserva of reservas) {
    if (reserva.cancelada || !reserva.fecha) continue;
    if (reserva.fecha < desde || reserva.fecha > hasta) continue;
    if (!porDia.has(reserva.fecha)) porDia.set(reserva.fecha, []);
    porDia.get(reserva.fecha).push(servicioDe(reserva));
  }
  return [...porDia.values()];
}

function compareFechaHora(a, b) {
  return (
    String(a.fecha).localeCompare(String(b.fecha)) ||
    (parseHoraToMinutes(a.hora) ?? 24 * 60) - (parseHoraToMinutes(b.hora) ?? 24 * 60)
  );
}

/**
 * Asigna automáticamente conductores activos (con su vehículo fijo) a reservas
 * sin conductor entre hoy (CR) y hoy + dias. Con dryRun=true solo devuelve propuestas.
 */
export async function runAutoAsignacionUseCase({
  dias = 2,
  dryRun = true,
  config = {},
} = {}) {
  const diasNum = Number(dias);
  if (!Number.isInteger(diasNum) || diasNum < 0 || diasNum > MAX_DIAS) {
    throw appError(`dias debe ser un entero entre 0 y ${MAX_DIAS}`, 400, "ValidationError");
  }
  const finalConfig = { ...DEFAULT_ASIGNACION_CONFIG, ...config };

  const desde = getTodayCR();
  const hasta = addDaysYmd(desde, diasNum);

  const [reservas, conductores, vehiculos] = await Promise.all([
    listReservasOrderedByFecha(),
    listConductores({ activos: true }),
    listVehiculos(),
  ]);

  const { tiempos, resumen: resumenTiempos } = await cargarTiemposReales(
    serviciosPorDiaEnRango(reservas, desde, hasta)
  );

  const ctx = {
    ...buildAgendas(reservas),
    vehiculosById: new Map(vehiculos.map((v) => [v.id, v])),
    tiempos,
  };
  const pendientes = reservas
    .filter((r) => r.fecha >= desde && r.fecha <= hasta && isReservaPendienteDeAsignar(r))
    .sort(compareFechaHora);

  const asignadas = [];
  const sinAsignar = [];
  const yaAsignadas = new Set();

  const registrar = async (reserva, resultado) => {
    const { conductor, vehiculo, asignaVehiculo, motivo, serviciosDia, kmVacio, esperaMin } = resultado;
    yaAsignadas.add(reserva.id);

    // Se agrega a las agendas en memoria para que las siguientes reservas lo vean.
    addToAgenda(ctx.agendaConductor, conductor.id, reserva);
    if (asignaVehiculo) addToAgenda(ctx.agendaVehiculo, vehiculo.id, reserva);

    const vehiculoFields = asignaVehiculo
      ? {
          vehiculoId: vehiculo.id,
          vehiculoPlaca: vehiculo.placa || "",
          buseta: vehiculo.placa || "",
        }
      : {};

    if (!dryRun) {
      await updateReservaById(reserva.id, {
        conductorId: conductor.id,
        conductorNombre: conductor.nombre || "",
        chofer: conductor.nombre || "",
        assignedUid: conductor.uid || "",
        ...vehiculoFields,
        asignacionAuto: {
          at: new Date().toISOString(),
          motivo,
          serviciosPreviosDia: serviciosDia,
          kmVacioEstimado: kmVacio ?? null,
          esperaEstimadaMin: esperaMin ?? null,
        },
      });
    }

    asignadas.push({
      id: reserva.id,
      fecha: reserva.fecha,
      hora: reserva.hora,
      cliente: reserva.cliente || "",
      conductorId: conductor.id,
      conductorNombre: conductor.nombre || "",
      assignedUid: conductor.uid || "",
      vehiculoId: vehiculo?.id || reserva.vehiculoId || "",
      vehiculoPlaca: vehiculo?.placa || reserva.vehiculoPlaca || "",
      motivo,
      kmVacio: kmVacio ?? null,
      esperaMin: esperaMin ?? null,
    });
  };

  // Reservas cuyo dropoff queda cerca del pickup de otra: se intenta que las haga un solo conductor.
  const parejas = buscarParejas(pendientes, finalConfig, tiempos);

  for (const reserva of pendientes) {
    if (yaAsignadas.has(reserva.id)) continue;

    const siguiente = parejas.get(reserva.id);
    if (siguiente && !yaAsignadas.has(siguiente.id)) {
      const pareja = pickConductorPareja(reserva, siguiente, conductores, ctx, finalConfig);
      if (pareja) {
        await registrar(reserva, pareja.primero);
        await registrar(siguiente, pareja.segundo);
        continue;
      }
    }

    const resultado = pickConductor(reserva, conductores, ctx, finalConfig);
    if (!resultado.conductor) {
      sinAsignar.push({ id: reserva.id, fecha: reserva.fecha, hora: reserva.hora, motivo: resultado.motivo });
      continue;
    }
    await registrar(reserva, resultado);
  }

  asignadas.sort(compareFechaHora);

  return {
    dryRun,
    desde,
    hasta,
    conductoresActivos: conductores.length,
    pendientes: pendientes.length,
    asignadas,
    sinAsignar,
    tiempos: resumenTiempos,
  };
}
