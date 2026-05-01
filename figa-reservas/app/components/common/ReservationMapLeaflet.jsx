"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { authenticatedJson } from "@/app/core/client/http/authenticatedFetch.js";

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const CODE_ALIASES = {
  SJO: "Aeropuerto Internacional Juan Santamaria, Costa Rica",
  LIR: "Aeropuerto Internacional Daniel Oduber, Liberia, Costa Rica",
};

const GARAGE_COORDS = {
  lat: 10.445556,
  lng: -84.570444,
};

let googleMapsScriptPromise = null;

function loadGoogleMapsScript(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps solo disponible en cliente"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const timeoutId = window.setTimeout(() => {
      if (window.google?.maps) {
        finish(resolve, window.google);
      } else {
        finish(reject, new Error("Timeout cargando Google Maps"));
      }
    }, 10000);

    const existing = document.querySelector('script[data-google-maps="true"]');
    if (existing) {
      if (window.google?.maps) {
        window.clearTimeout(timeoutId);
        finish(resolve, window.google);
        return;
      }

      existing.addEventListener("load", () => {
        window.clearTimeout(timeoutId);
        if (window.google?.maps) {
          finish(resolve, window.google);
        } else {
          finish(reject, new Error("Google Maps no disponible tras cargar script existente"));
        }
      });
      existing.addEventListener("error", () => {
        window.clearTimeout(timeoutId);
        finish(reject, new Error("No se pudo cargar Google Maps"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";

    script.onload = () => {
      window.clearTimeout(timeoutId);
      if (window.google?.maps) {
        finish(resolve, window.google);
      } else {
        finish(reject, new Error("Google Maps no disponible tras cargar script"));
      }
    };
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      finish(reject, new Error("No se pudo cargar Google Maps"));
    };

    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

function getConductorDate(updatedAt) {
  if (!updatedAt) return null;
  try {
    return updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
  } catch {
    return null;
  }
}

function formatConductorTime(updatedAt) {
  const date = getConductorDate(updatedAt);
  if (!date) return null;
  return date.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeMinutes(updatedAt) {
  const date = getConductorDate(updatedAt);
  if (!date) return null;

  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) return null;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes <= 0) return "ahora";
  if (diffMinutes === 1) return "hace 1 min";
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return "hace 1 hora";
  if (diffHours < 24) return `hace ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "hace 1 dia" : `hace ${diffDays} dias`;
}

function buildAddressCandidates(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const upper = raw.toUpperCase();
  const candidates = [raw];

  if (CODE_ALIASES[upper]) {
    candidates.push(CODE_ALIASES[upper]);
  }

  if (!/costa\s+rica/i.test(raw)) {
    candidates.push(`${raw}, Costa Rica`);
  }

  return [...new Set(candidates)];
}

function geocodeByAddress(googleMaps, geocoder, address) {
  return new Promise((resolve) => {
    geocoder.geocode(
      {
        address,
        componentRestrictions: { country: "CR" },
      },
      (results, status) => {
        if (status === "OK" && Array.isArray(results) && results[0]?.geometry?.location) {
          const location = results[0].geometry.location;
          resolve({ lat: location.lat(), lng: location.lng() });
          return;
        }

        resolve(null);
      }
    );
  });
}

async function geocodeAddress(googleMaps, geocoder, text) {
  const candidates = buildAddressCandidates(text);
  for (const candidate of candidates) {
    const result = await geocodeByAddress(googleMaps, geocoder, candidate);
    if (result) return result;
  }
  return null;
}

async function getDrivingRouteFromApi(origin, destination) {
  if (!origin || !destination) return null;

  try {
    const params = new URLSearchParams({
      originLat: String(origin.lat),
      originLng: String(origin.lng),
      destinationLat: String(destination.lat),
      destinationLng: String(destination.lng),
    });

    const data = await authenticatedJson(`/api/maps/route?${params.toString()}`, {
      method: "GET",
    });

    return {
      path: Array.isArray(data?.path) ? data.path : null,
      distanceKm: Number.isFinite(Number(data?.distanceKm)) ? Number(data.distanceKm) : null,
      fallback: Boolean(data?.fallback),
      provider: String(data?.provider || "api"),
    };
  } catch {
    return null;
  }
}

async function getBestDrivingRoute(origin, destination) {
  return getDrivingRouteFromApi(origin, destination);
}

export default function ReservationMapLeaflet({
  pickUp,
  dropOff,
  conductorId,
  conductorUid,
  conductorName,
}) {
  const mapNodeRef = useRef(null);
  const googleRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markerRefs = useRef({
    pickup: null,
    dropoff: null,
    garage: null,
    conductor: null,
    fallbackRoute: null,
  });

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const [conductorLocation, setConductorLocation] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [geocoding, setGeocoding] = useState(true);
  const [routeKm, setRouteKm] = useState(null);
  const [conductorToPickupKm, setConductorToPickupKm] = useState(null);
  const [fuelPrices, setFuelPrices] = useState(null);
  const [fuelType, setFuelType] = useState("diesel");
  const [kmPorLitro, setKmPorLitro] = useState(12);
  const [fuelLoading, setFuelLoading] = useState(false);

  const hasConductorAssigned = Boolean(conductorId || conductorUid);
  const conductorDisplayName = useMemo(
    () => String(conductorName || "").trim() || "Sin nombre",
    [conductorName]
  );

  useEffect(() => {
    if (!hasConductorAssigned) {
      setConductorLocation(null);
      return undefined;
    }

    let cancelled = false;
    let intervalId = null;

    const fetchLocation = async () => {
      try {
        const params = new URLSearchParams();
        if (conductorId) params.set("conductorId", conductorId);
        if (conductorUid) params.set("conductorUid", conductorUid);

        const data = await authenticatedJson(
          `/api/conductores/location?${params.toString()}`,
          { method: "GET" }
        );

        if (cancelled) return;

        const loc = data?.location;
        if (loc && Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng))) {
          setConductorLocation({
            lat: Number(loc.lat),
            lng: Number(loc.lng),
            accuracy:
              loc.accuracy != null && Number.isFinite(Number(loc.accuracy))
                ? Number(loc.accuracy)
                : null,
            updatedAt: loc.updatedAt || null,
          });
        } else {
          setConductorLocation(null);
        }
      } catch {
        if (!cancelled) {
          setConductorLocation(null);
        }
      }
    };

    fetchLocation();
    intervalId = window.setInterval(fetchLocation, 20000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [conductorId, conductorUid, hasConductorAssigned]);

  useEffect(() => {
    if (!mapNodeRef.current) return;
    if (mapRef.current) return;

    if (!GOOGLE_MAPS_KEY) {
      setMapError("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para mostrar Google Maps.");
      setMapLoading(false);
      return;
    }

    let cancelled = false;

    loadGoogleMapsScript(GOOGLE_MAPS_KEY)
      .then((googleMaps) => {
        if (cancelled || !mapNodeRef.current) return;

        googleRef.current = googleMaps;

        mapRef.current = new googleMaps.maps.Map(mapNodeRef.current, {
          center: { lat: 9.9281, lng: -84.0907 },
          zoom: 9,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        geocoderRef.current = new googleMaps.maps.Geocoder();

        setMapLoading(false);
        setMapError("");

        setTimeout(() => {
          if (mapRef.current && googleRef.current) {
            googleRef.current.maps.event.trigger(mapRef.current, "resize");
          }
        }, 120);
      })
      .catch(() => {
        if (!cancelled) {
          setMapError(
            "No se pudo cargar Google Maps. Revisa la API key, restricciones por dominio y que Maps JavaScript API este habilitada."
          );
          setMapLoading(false);
        }
      });

    return () => {
      cancelled = true;
      markerRefs.current = {
        pickup: null,
        dropoff: null,
        garage: null,
        conductor: null,
        fallbackRoute: null,
      };
      mapRef.current = null;
      geocoderRef.current = null;
      googleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const googleMaps = googleRef.current;
    const geocoder = geocoderRef.current;

    if (!googleMaps || !geocoder) return;

    let cancelled = false;
    setGeocoding(true);

    Promise.all([
      pickUp ? geocodeAddress(googleMaps, geocoder, pickUp) : Promise.resolve(null),
      dropOff ? geocodeAddress(googleMaps, geocoder, dropOff) : Promise.resolve(null),
    ]).then(([pickup, dropoff]) => {
      if (cancelled) return;
      setPickupCoords(pickup);
      setDropoffCoords(dropoff);
      setGeocoding(false);
    });

    return () => {
      cancelled = true;
    };
  }, [pickUp, dropOff, mapLoading]);

  useEffect(() => {
    let cancelled = false;

    if (!pickupCoords || !dropoffCoords) {
      setRoutePath(null);
      setRouteKm(null);
      return undefined;
    }

    Promise.all([
      getBestDrivingRoute(pickupCoords, dropoffCoords),
      getBestDrivingRoute(dropoffCoords, GARAGE_COORDS),
    ]).then(([reservationRoute, garageRoute]) => {
      if (cancelled) return;

      const reservationKm = reservationRoute?.distanceKm;
      const garageKm = garageRoute?.distanceKm;
      if (!Number.isFinite(reservationKm) || !Number.isFinite(garageKm)) {
        setRoutePath(null);
        setRouteKm(null);
        return;
      }

      const combinedPath = [
        ...(Array.isArray(reservationRoute?.path) ? reservationRoute.path : [pickupCoords, dropoffCoords]),
        ...(Array.isArray(garageRoute?.path)
          ? garageRoute.path.slice(1)
          : [GARAGE_COORDS]),
      ];

      setRoutePath(combinedPath.length > 1 ? combinedPath : null);
      setRouteKm(Math.round((reservationKm + garageKm) * 10) / 10);
    });

    return () => {
      cancelled = true;
    };
  }, [pickupCoords, dropoffCoords]);

  // Calcular distancia conductor -> pickup
  useEffect(() => {
    let cancelled = false;

    if (!hasConductorAssigned || !conductorLocation || !pickupCoords) {
      setConductorToPickupKm(null);
      return undefined;
    }

    getBestDrivingRoute(conductorLocation, pickupCoords).then((result) => {
      if (!cancelled) {
        setConductorToPickupKm(result?.distanceKm ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hasConductorAssigned, conductorLocation, pickupCoords]);

  useEffect(() => {
    const googleMaps = googleRef.current;
    const map = mapRef.current;

    if (!googleMaps || !map) return;

    if (markerRefs.current.pickup) markerRefs.current.pickup.setMap(null);
    if (markerRefs.current.dropoff) markerRefs.current.dropoff.setMap(null);
    if (markerRefs.current.garage) markerRefs.current.garage.setMap(null);
    if (markerRefs.current.fallbackRoute) markerRefs.current.fallbackRoute.setMap(null);

    markerRefs.current.pickup = null;
    markerRefs.current.dropoff = null;
    markerRefs.current.garage = null;
    markerRefs.current.fallbackRoute = null;

    const bounds = new googleMaps.maps.LatLngBounds();

    if (pickupCoords) {
      markerRefs.current.pickup = new googleMaps.maps.Marker({
        position: pickupCoords,
        map,
        title: "Pick up",
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#16a34a",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      bounds.extend(pickupCoords);
    }

    if (dropoffCoords) {
      markerRefs.current.dropoff = new googleMaps.maps.Marker({
        position: dropoffCoords,
        map,
        title: "Drop off",
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#dc2626",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      bounds.extend(dropoffCoords);
    }

    markerRefs.current.garage = new googleMaps.maps.Marker({
      position: GARAGE_COORDS,
      map,
      title: "Garage",
      icon: {
        path: googleMaps.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#63815b",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
    bounds.extend(GARAGE_COORDS);

    if (pickupCoords && dropoffCoords) {
      markerRefs.current.fallbackRoute = new googleMaps.maps.Polyline({
        path:
          Array.isArray(routePath) && routePath.length > 1
            ? routePath
            : [pickupCoords, dropoffCoords, GARAGE_COORDS],
        geodesic: false,
        strokeColor: "#1d4ed8",
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map,
      });
    }

    if (conductorLocation) bounds.extend(conductorLocation);
    if (!bounds.isEmpty()) map.fitBounds(bounds, 64);
  }, [pickupCoords, dropoffCoords, routePath, conductorLocation]);

  useEffect(() => {
    const googleMaps = googleRef.current;
    const map = mapRef.current;
    if (!googleMaps || !map) return;

    if (markerRefs.current.conductor) {
      markerRefs.current.conductor.setMap(null);
      markerRefs.current.conductor = null;
    }

    if (!conductorLocation) return;

    markerRefs.current.conductor = new googleMaps.maps.Marker({
      position: { lat: conductorLocation.lat, lng: conductorLocation.lng },
      map,
      title: "Conductor",
      icon: {
        path: googleMaps.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#2563eb",
        fillOpacity: 0.95,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 999,
    });
  }, [conductorLocation]);

  // Fetch RECOPE fuel prices once on mount
  useEffect(() => {
    let cancelled = false;
    setFuelLoading(true);
    fetch("/api/maps/fuel-price")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((prices) => {
        if (!cancelled) setFuelPrices(prices);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFuelLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const conductorTime = formatConductorTime(conductorLocation?.updatedAt);
  const conductorRelative = formatRelativeMinutes(conductorLocation?.updatedAt);

  return (
    <div className="reservation-leaflet-wrapper">
      <div className="route-map-canvas-wrap">
        <div
          ref={mapNodeRef}
          className="route-map-frame"
          style={{ visibility: mapError ? "hidden" : "visible" }}
        />
        {mapLoading ? (
          <div className="route-map-fallback route-map-overlay" style={{ minHeight: 120 }}>
            <p>Cargando Google Maps...</p>
          </div>
        ) : null}
        {mapError ? (
          <div className="route-map-fallback route-map-overlay" style={{ minHeight: 120 }}>
            <p>{mapError}</p>
          </div>
        ) : null}
      </div>

      {!mapLoading && !mapError ? (
        <div className="map-legend">
          <span className="map-legend-item">
            <span className="map-legend-dot" style={{ background: "#16a34a" }} />
            Pick up
          </span>
          <span className="map-legend-item">
            <span className="map-legend-dot" style={{ background: "#dc2626" }} />
            Drop off
          </span>
          <span className="map-legend-item">
            <span className="map-legend-dot" style={{ background: "#63815b" }} />
            Garage
          </span>
          {hasConductorAssigned ? (
            <span className="map-legend-item">
              <span className="map-legend-dot map-legend-pulse" />
              Conductor
              {conductorLocation ? " · posicion activa" : " · sin posicion"}
            </span>
          ) : null}
        </div>
      ) : null}

      {hasConductorAssigned ? (
        <div className="map-conductor-card">
          <div className="map-conductor-card-title">Conductor asignado</div>
          <div className="map-conductor-name">{conductorDisplayName}</div>
          <div className="map-conductor-metrics">
            <span>
              Precision: {conductorLocation?.accuracy != null ? `${Math.round(conductorLocation.accuracy)} m` : "sin dato"}
            </span>
            <span>
              Ultima actualizacion: {conductorLocation ? conductorRelative || conductorTime || "sin hora" : "sin posicion"}
            </span>
            {conductorLocation && conductorTime ? <span>Hora: {conductorTime}</span> : null}
          </div>
        </div>
      ) : null}

      {!mapLoading && !mapError && routeKm != null ? (
        <div className="map-fuel-card">
          <div className="map-fuel-card-title">⛽ Combustible estimado</div>
          <div className="map-fuel-row">
              <span className="map-fuel-label">Ruta (Pickup -&gt; DropOff -&gt; Garage):</span>
            <span className="map-fuel-value">{routeKm} km</span>
          </div>
          {hasConductorAssigned && conductorToPickupKm != null ? (
            <div className="map-fuel-row">
                <span className="map-fuel-label">Conductor -&gt; Pickup:</span>
              <span className="map-fuel-value">{conductorToPickupKm} km</span>
            </div>
          ) : null}
          <div className="map-fuel-controls">
            <div className="map-fuel-control-group">
              <label className="map-fuel-label" htmlFor="map-fuel-type">Tipo</label>
              <select
                id="map-fuel-type"
                className="map-fuel-select"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
              >
                <option value="super">Super</option>
                <option value="regular">Regular</option>
                <option value="diesel">Diesel</option>
              </select>
            </div>
            <div className="map-fuel-control-group">
              <label className="map-fuel-label" htmlFor="map-km-por-litro">Rendimiento</label>
              <div className="map-fuel-input-wrap">
                <input
                  id="map-km-por-litro"
                  type="number"
                  className="map-fuel-input"
                  min="1"
                  max="99"
                  step="0.5"
                  value={kmPorLitro}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v) && v > 0) setKmPorLitro(v);
                  }}
                />
                <span className="map-fuel-input-unit">km/l</span>
              </div>
            </div>
          </div>
          {fuelLoading ? (
            <div className="map-fuel-hint">Consultando precios RECOPE...</div>
          ) : fuelPrices ? (() => {
            const kmTotal = hasConductorAssigned && conductorToPickupKm != null
              ? routeKm + conductorToPickupKm
              : routeKm;
            const litros = kmTotal / kmPorLitro;
            const precio = fuelPrices[fuelType];
            const costo = precio != null ? litros * precio : null;
            return (
              <div className="map-fuel-result">
                <div className="map-fuel-result-item">
                  <span className="map-fuel-label">Distancia total:</span>
                  <span className="map-fuel-value">{kmTotal.toFixed(1)} km</span>
                </div>
                <div className="map-fuel-result-item">
                  <span className="map-fuel-label">Consumo estimado:</span>
                  <span className="map-fuel-value">{litros.toFixed(1)} L</span>
                </div>
                {costo != null ? (
                  <div className="map-fuel-result-item">
                    <span className="map-fuel-label">Costo estimado:</span>
                    <span className="map-fuel-value map-fuel-cost">
                      ₡{Math.round(costo).toLocaleString("es-CR")}
                    </span>
                  </div>
                ) : null}
                {hasConductorAssigned && conductorToPickupKm != null ? (
                  <div className="map-fuel-notice">
                    ⚠️ Incluye distancia del conductor al pickup y la ruta completa hasta el garage.
                  </div>
                ) : (
                  <div className="map-fuel-notice">
                    i Calcula la ruta pickup a dropoff y el regreso fijo al garage.
                  </div>
                )}
                {precio != null ? (
                  <div className="map-fuel-hint">
                    Precio {fuelType} al {new Date().toLocaleDateString("es-CR")}: {precio.toLocaleString("es-CR")} CRC/L (RECOPE)
                  </div>
                ) : null}
              </div>
            );
          })() : null}
        </div>
      ) : null}

      {!mapLoading && !mapError && !geocoding && !pickupCoords && !dropoffCoords ? (
        <p className="route-map-fallback" style={{ marginTop: 8 }}>
          No se pudieron geocodificar las direcciones con Google Maps.
        </p>
      ) : null}
    </div>
  );
}
