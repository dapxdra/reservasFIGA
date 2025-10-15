import { useState, useEffect } from "react";
import { getReservas } from "../lib/api";

export function useReservas(filtro, searchQuery, filters) {
  const [reservas, setReservas] = useState([]);
  const [filteredReservas, setFilteredReservas] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const data = await getReservas({ filtro, searchQuery, ...filters });
      setReservas(data);
    }
    fetchData();
  }, [filtro, searchQuery, filters]);

  useEffect(() => {
    let filtered = [...reservas];

    // Filtro principal por estado
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    if (filtro === "activas") {
      filtered = filtered.filter((r) => {
        const fecha = new Date(r.fecha);
        fecha.setHours(0, 0, 0, 0);
        return (
          (fecha.getTime() === hoy.getTime() ||
            fecha.getTime() === manana.getTime()) &&
          !r.cancelada
        );
      });
    } else if (filtro === "futuras") {
      filtered = filtered.filter((r) => {
        const fecha = new Date(r.fecha);
        fecha.setHours(0, 0, 0, 0);
        return fecha > manana && !r.cancelada;
      });
    } else if (filtro === "antiguas") {
      filtered = filtered.filter((r) => {
        const fecha = new Date(r.fecha);
        fecha.setHours(0, 0, 0, 0);
        return fecha < hoy && !r.cancelada;
      });
    } else if (filtro === "canceladas") {
      filtered = filtered.filter((r) => r.cancelada);
    }

    // Filtro por búsqueda libre
    if (searchQuery) {
      filtered = filtered.filter(
        (reserva) =>
          reserva.id?.toString().includes(searchQuery) ||
          reserva.itinId?.toString().includes(searchQuery) ||
          reserva.cliente?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reserva.proveedor?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtros avanzados
    if (filters.startDate) {
      filtered = filtered.filter(
        (r) => new Date(r.fecha) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(
        (r) => new Date(r.fecha) <= new Date(filters.endDate)
      );
    }
    if (filters.month) {
      filtered = filtered.filter((r) => {
        const reservaMonth = new Date(r.fecha).getMonth() + 1;
        return reservaMonth === parseInt(filters.month);
      });
    }
    if (filters.cliente) {
      filtered = filtered.filter((r) =>
        r.cliente?.toLowerCase().includes(filters.cliente.toLowerCase())
      );
    }
    if (filters.proveedor) {
      filtered = filtered.filter((r) =>
        r.proveedor?.toLowerCase().includes(filters.proveedor.toLowerCase())
      );
    }
    if (filters.itinId) {
      filtered = filtered.filter(
        (r) => r.itinId?.toString() === filters.itinId
      );
    }
    if (filters.id) {
      filtered = filtered.filter((r) => r.id?.toString() === filters.id);
    }

    setFilteredReservas(filtered);
  }, [reservas, searchQuery, filters]);

  return { reservas, filteredReservas, setReservas };
}
