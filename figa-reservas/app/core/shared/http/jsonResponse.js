export function jsonResponse(data = {}, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export function safeErrorMessage(error, fallback = "Error interno del servidor") {
  return String(error?.message || "").trim() || fallback;
}
