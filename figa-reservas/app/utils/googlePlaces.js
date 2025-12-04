// Llama a Places Autocomplete (REST v1) y devuelve predicciones.
// Solo se usará el displayName para pickUp/dropOff (string).
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Sesión opcional: puedes pasar un ID por búsqueda (mejor relevancia/cobro).
export async function fetchPlacePredictions(
  input,
  { languageCode = "es", regionCode = "CR", sessionToken } = {}
) {
  if (!API_KEY) {
    console.warn("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
    return [];
  }
  if (!input || !input.trim()) return [];

  const url = "https://places.googleapis.com/v1/places:autocomplete";
  const body = {
    input,
    languageCode,
    regionCode,
    // sessionToken, // comenta o pasa uno si lo manejas por búsqueda
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      // "X-Goog-FieldMask": "*", // no necesario para autocomplete
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Autocomplete error:", res.status, err);
    return [];
  }

  const data = await res.json();
  // predictions: array de objetos con structuredFormat, placePrediction, etc.
  const predictions = data?.suggestions || [];

  // Mapeamos a un nombre legible (displayName) y guardamos placeId comentado para futuro
  return predictions.map((p) => {
    const displayName =
      p?.placePrediction?.text?.text ||
      p?.structuredFormat?.mainText?.text ||
      p?.structuredFormat?.secondaryText?.text ||
      "";

    return {
      name: displayName,
      // Futuro (comentado): datos adicionales
      // placeId: p?.placePrediction?.placeId || "",
      // types: p?.placePrediction?.types || [],
    };
  });
}
