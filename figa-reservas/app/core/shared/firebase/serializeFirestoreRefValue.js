export function serializeFirestoreRefValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (typeof value === "object") {
    try {
      if (typeof value.path === "string") {
        const parts = value.path.split("/");
        return parts[parts.length - 1] || value.path;
      }
      if (Array.isArray(value._path?.segments)) {
        const segments = value._path.segments;
        return segments[segments.length - 1] || "";
      }
    } catch (error) {
      console.warn("Error serializando referencia Firestore:", error);
      return "";
    }
  }

  return "";
}
