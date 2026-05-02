"use client";
import { useState } from "react";
import { actualizarReserva } from "@/app/lib/api.js";
import { useRouter } from "next/navigation";
import "../../styles/forms.css";
import LogoNav from "./LogoNav";
import { useReservasData } from "../../context/ReservasDataContext.js";
import toast from "react-hot-toast";
import PlaceAutocomplete from "./placeAutocomplete";
import TimePickerField from "./TimePickerField";
import { useCatalogos } from "../../hooks/useCatalogos.js";

export default function EditReservaForm({ reservaInicial }) {
  const [reserva, setReserva] = useState(reservaInicial);
  const router = useRouter();
  const {
    conductores,
    vehiculos,
    loadingCatalogos,
    catalogosError,
    recargarCatalogos,
  } = useCatalogos();

  const { invalidateCache } = useReservasData();

  const [guardando, setGuardando] = useState(false);
  const [saved, setSaved] = useState(false);

  const openDatePicker = (event) => {
    if (typeof event.currentTarget.showPicker === "function") {
      event.currentTarget.showPicker();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (guardando || saved) return; // Prevenir múltiples envíos
    setGuardando(true);

    const promise = actualizarReserva(reserva.id, reserva).then((response) => {
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    });

    await toast.promise(promise, {
      loading: "Actualizando reserva...",
      success: () => {
        invalidateCache();
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
        return "Reserva actualizada con éxito";
      },
      error: "Error al actualizar la reserva",
    });

    setGuardando(false);
  };
  return (
    <div className="form-shell">
      <LogoNav />
      <div className="form-container">
        <h1 className="form-title">Editar Reserva</h1>
        
        <form onSubmit={handleSubmit} className="form-wrapper">
          {/* Detalles del Cliente */}
          <section className="form-section form-section-client">
            <h2 className="form-section-title">Detalles del Cliente</h2>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Cliente</label>
                <input
                  type="text"
                  name="cliente"
                  value={reserva.cliente || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, cliente: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Agencia</label>
                <input
                  type="text"
                  name="proveedor"
                  value={reserva.proveedor || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, proveedor: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">ItinID</label>
                <input
                  type="number"
                  name="itinId"
                  value={reserva.itinId || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, itinId: e.target.value })
                  }
                  className="form-input"
                />
              </div>
            </div>
          </section>

          {/* Itinerario */}
          <section className="form-section form-section-itinerary">
            <h2 className="form-section-title">Itinerario</h2>
            <div className="form-grid">
              <div className="form-field form-field-full">
                <label className="form-label">Pick Up</label>
                <PlaceAutocomplete
                  name="pickUp"
                  value={reserva.pickUp || ""}
                  onSelect={({ name, lat, lng }) => setReserva({ ...reserva, pickUp: name, pickUpLat: lat, pickUpLng: lng })}
                  placeholder="Ej: Aeropuerto Juan Santamaría, Hotel..."
                  inputClassName="form-input"
                  helperTextClassName="form-help"
                />
              </div>
              <div className="form-field form-field-full">
                <label className="form-label">Drop Off</label>
                <PlaceAutocomplete
                  name="dropOff"
                  value={reserva.dropOff || ""}
                  onSelect={({ name, lat, lng }) => setReserva({ ...reserva, dropOff: name, dropOffLat: lat, dropOffLng: lng })}
                  placeholder="Ej: Hotel Hilton, Monteverde..."
                  inputClassName="form-input"
                  helperTextClassName="form-help"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  value={reserva.fecha || ""}
                  onClick={openDatePicker}
                  onFocus={openDatePicker}
                  onKeyDown={(event) => {
                    if (event.key !== "Tab") {
                      event.preventDefault();
                    }
                  }}
                  onChange={(e) =>
                    setReserva({ ...reserva, fecha: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Hora</label>
                <TimePickerField
                  value={reserva.hora || ""}
                  onChange={(value) => setReserva({ ...reserva, hora: value })}
                />
              </div>
            </div>
          </section>

          {/* Tarifas y Pasajeros */}
          <section className="form-section form-section-rates">
            <h2 className="form-section-title">Tarifas y Pasajeros</h2>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Adultos</label>
                <input
                  type="number"
                  name="adultos"
                  value={reserva.AD || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, AD: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Niños</label>
                <input
                  type="number"
                  name="niños"
                  value={reserva.NI || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, NI: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="precio"
                  value={reserva.precio || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, precio: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Fecha Pago</label>
                <input
                  type="date"
                  name="fechaPago"
                  value={reserva.fechaPago || ""}
                  onClick={openDatePicker}
                  onFocus={openDatePicker}
                  onKeyDown={(event) => {
                    if (event.key !== "Tab") {
                      event.preventDefault();
                    }
                  }}
                  onChange={(e) =>
                    setReserva({ ...reserva, fechaPago: e.target.value })
                  }
                  className="form-input"
                />
              </div>
            </div>
          </section>

          {/* Estado de Pago */}
          <section className="form-section form-section-payment">
            <h2 className="form-section-title">Estado de Pago</h2>
            <div className="form-grid">
              <div className="form-field form-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="pago"
                    checked={reserva.pago || false}
                    onChange={(e) =>
                      setReserva({ ...reserva, pago: e.target.checked })
                    }
                    className="checkbox-input"
                  />
                  <span>Reserva pagada</span>
                </label>
              </div>
            </div>
          </section>

          {/* Logística Adicional */}
          <section className="form-section form-section-logistics">
            <h2 className="form-section-title">Logística Adicional</h2>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Conductor</label>
                <select
                  name="conductorId"
                  value={reserva.conductorId || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, conductorId: e.target.value })
                  }
                  className="form-input"
                  disabled={loadingCatalogos}
                >
                  <option value="">Sin asignar</option>
                  {conductores.map((conductor) => (
                    <option key={conductor.id} value={conductor.id}>
                      {conductor.nombre}
                    </option>
                  ))}
                </select>
                {loadingCatalogos ? (
                  <span className="form-help">Cargando conductores...</span>
                ) : null}
              </div>
              <div className="form-field">
                <label className="form-label">Vehículo</label>
                <select
                  name="vehiculoId"
                  value={reserva.vehiculoId || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, vehiculoId: e.target.value })
                  }
                  className="form-input"
                  disabled={loadingCatalogos}
                >
                  <option value="">Sin asignar</option>
                  {vehiculos.map((vehiculo) => (
                    <option key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.placa}
                      {vehiculo.modelo ? ` - ${vehiculo.modelo}` : ""}
                    </option>
                  ))}
                </select>
                {loadingCatalogos ? (
                  <span className="form-help">Cargando vehículos...</span>
                ) : null}
              </div>
              {catalogosError ? (
                <div className="form-field form-field-full">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800 flex items-center justify-between gap-3">
                    <span>{catalogosError}</span>
                    <button type="button" onClick={recargarCatalogos} className="btn-secondary">
                      Reintentar
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="form-field form-field-full">
                <label className="form-label">Nota</label>
                <textarea
                  name="nota"
                  value={reserva.nota || ""}
                  onChange={(e) =>
                    setReserva({ ...reserva, nota: e.target.value })
                  }
                  className="form-input form-textarea"
                  rows="3"
                />
              </div>
            </div>
          </section>

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="btn-secondary"
            >
              Descartar cambios
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="btn-primary"
            >
              {guardando ? "Actualizando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
