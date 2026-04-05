"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../../styles/forms.css";
import { crearReserva } from "@/app/lib/api";
import LogoNav from "./LogoNav";
import { useReservasData } from "../../context/ReservasDataContext.js";
import { getTodayCR } from "../../utils/getTodayCR.js";
import toast from "react-hot-toast";
import PlaceAutocomplete from "./placeAutocomplete";
import TimePickerField from "./TimePickerField";

export default function ReservaForm() {
  const { invalidateCache } = useReservasData();
  const [formData, setFormData] = useState({
    cliente: "",
    fecha: "",
    hora: "",
    dropOff: "",
    pickUp: "",
    proveedor: "",
    nota: "",
    precio: 0,
    AD: 0,
    NI: 0,
    chofer: "",
    buseta: 0,
    pago: false,
    fechaPago: "",
    cancelada: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openDatePicker = (event) => {
    if (typeof event.currentTarget.showPicker === "function") {
      event.currentTarget.showPicker();
    }
  };

  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (guardando || saved) return; // Prevenir múltiples envíos
    setGuardando(true);

    const promise = crearReserva(formData).then((response) => {
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    });
    await toast.promise(promise, {
      loading: "Guardando reserva...",
      success: (data) => {
        invalidateCache();
        setSaved(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
        return `Reserva creada: Cliente: ${formData.cliente} - ItinID: ${formData.itinId} - Proveedor: ${formData.proveedor}`;
      },
      error: (err) => `Error al guardar la reserva: ${err.message}`,
    });

    setGuardando(false);
  };

  return (
    <div className="form-shell">
      <LogoNav />
      <div className="form-container">
        <h1 className="form-title">Nueva Reserva</h1>
        
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
                  value={formData.cliente}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Agencia</label>
                <input
                  type="text"
                  name="proveedor"
                  value={formData.proveedor}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">ItinID</label>
                <input
                  type="number"
                  name="itinId"
                  value={formData.itinId || ""}
                  onChange={handleChange}
                  required
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
                  value={formData.pickUp}
                  onSelect={(name) => {
                    setFormData((prev) => ({ ...prev, pickUp: name }));
                  }}
                  placeholder="Ej: Aeropuerto Juan Santamaría, Hotel..."
                  required
                  inputClassName="form-input"
                  helperTextClassName="form-help"
                />
              </div>
              <div className="form-field form-field-full">
                <label className="form-label">Drop Off</label>
                <PlaceAutocomplete
                  name="dropOff"
                  value={formData.dropOff}
                  onSelect={(name) => {
                    setFormData((prev) => ({ ...prev, dropOff: name }));
                  }}
                  placeholder="Ej: Hotel Hilton, Monteverde..."
                  required
                  inputClassName="form-input"
                  helperTextClassName="form-help"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  min={getTodayCR()}
                  value={formData.fecha}
                  onClick={openDatePicker}
                  onFocus={openDatePicker}
                  onKeyDown={(event) => {
                    if (event.key !== "Tab") {
                      event.preventDefault();
                    }
                  }}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Hora</label>
                <TimePickerField
                  value={formData.hora}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, hora: value }))
                  }
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
                  name="AD"
                  value={formData.AD}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Niños</label>
                <input
                  type="number"
                  name="NI"
                  value={formData.NI}
                  onChange={handleChange}
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
                  value={formData.precio}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Fecha Pago</label>
                <input
                  type="date"
                  name="fechaPago"
                  value={formData.fechaPago}
                  onClick={openDatePicker}
                  onFocus={openDatePicker}
                  onKeyDown={(event) => {
                    if (event.key !== "Tab") {
                      event.preventDefault();
                    }
                  }}
                  onChange={handleChange}
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
                    checked={formData.pago}
                    onChange={handleChange}
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
                <label className="form-label">Chofer</label>
                <input
                  type="text"
                  name="chofer"
                  value={formData.chofer}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Buseta</label>
                <input
                  type="number"
                  name="buseta"
                  value={formData.buseta}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-field form-field-full">
                <label className="form-label">Nota</label>
                <textarea
                  name="nota"
                  value={formData.nota}
                  onChange={handleChange}
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
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || saved}
              className="btn-primary"
            >
              {guardando
                ? "Guardando..."
                : saved
                ? "Reserva guardada"
                : "Guardar reserva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
