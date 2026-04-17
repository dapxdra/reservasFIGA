import { auth } from "@/app/lib/firebase.jsx";

function shouldSendJsonContentType(options) {
  if (!options?.body) return false;
  if (typeof FormData !== "undefined" && options.body instanceof FormData) {
    return false;
  }
  return true;
}

export async function buildAuthHeaders(extraHeaders = {}) {
  // Wait for Firebase to restore auth state from persistence before checking currentUser.
  // Without this, a page refresh races against auth initialization and currentUser is null.
  await auth.authStateReady();
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error("Usuario no autenticado");
  }

  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
}

export async function authenticatedFetch(url, options = {}) {
  const currentHeaders = options.headers || {};
  const withJson = shouldSendJsonContentType(options)
    ? { "Content-Type": "application/json", ...currentHeaders }
    : currentHeaders;

  const headers = await buildAuthHeaders(withJson);
  return fetch(url, { ...options, headers });
}

export async function authenticatedJson(url, options = {}) {
  const response = await authenticatedFetch(url, options);

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Error HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
