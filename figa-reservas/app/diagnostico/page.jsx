"use client";

import { useState } from "react";
import { auth } from "@/app/lib/firebase.jsx";

export default function DiagnosticoPage() {
  const [diagnostico, setDiagnostico] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const ejecutarDiagnostico = async () => {
    setCargando(true);
    setError(null);
    setDiagnostico(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("No hay usuario autenticado");
        setCargando(false);
        return;
      }

      const response = await fetch("/api/diagnostico", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setDiagnostico(data);

      if (!response.ok) {
        setError(`HTTP ${response.status}`);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Diagnóstico de Catálogos</h1>
      
      <button
        onClick={ejecutarDiagnostico}
        disabled={cargando}
        style={{
          padding: "10px 20px",
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: cargando ? "not-allowed" : "pointer",
        }}
      >
        {cargando ? "Cargando..." : "Ejecutar Diagnóstico"}
      </button>

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            background: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            border: "1px solid #f5c6cb",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {diagnostico && (
        <div style={{ marginTop: "20px" }}>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "15px",
              borderRadius: "4px",
              overflow: "auto",
              border: "1px solid #ddd",
            }}
          >
            {JSON.stringify(diagnostico, null, 2)}
          </pre>
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          background: "#e7f3ff",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        <p>
          <strong>¿Qué significa esto?</strong>
        </p>
        <ul>
          <li><strong>authenticated:</strong> Si estás logeado correctamente</li>
          <li><strong>role:</strong> Tu rol de usuario (admin, operador, conductor)</li>
          <li><strong>canViewCatalogos:</strong> Si deberías poder ver los catálogos de conductores y vehículos</li>
          <li><strong>collections:</strong> Si las colecciones existen en Firestore y cuántos documentos hay</li>
          <li><strong>errors:</strong> Cualquier error que se haya encontrado</li>
        </ul>
      </div>
    </div>
  );
}
