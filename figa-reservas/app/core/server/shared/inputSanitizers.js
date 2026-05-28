import { appError } from "@/app/core/server/shared/appError.js";

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function ensureString(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export function sanitizeString(value, options = {}) {
  const {
    trim = true,
    lower = false,
    upper = false,
    maxLength,
  } = options;

  let result = ensureString(value).replace(CONTROL_CHARS_REGEX, "");

  if (trim) {
    result = result.trim();
  }
  if (lower) {
    result = result.toLowerCase();
  }
  if (upper) {
    result = result.toUpperCase();
  }

  if (typeof maxLength === "number" && maxLength > 0) {
    result = result.slice(0, maxLength);
  }

  return result;
}

export function sanitizeObjectStrings(input, depth = 0) {
  if (depth > 20) return input;

  if (typeof input === "string") {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObjectStrings(item, depth + 1));
  }

  if (!input || typeof input !== "object") {
    return input;
  }

  const output = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = sanitizeObjectStrings(value, depth + 1);
  }

  return output;
}

export function sanitizeId(id, fieldName = "ID") {
  const value = sanitizeString(id, { maxLength: 128 });
  if (!value) {
    throw appError(`${fieldName} no proporcionado`, 400, "ValidationError");
  }
  if (value.includes("/")) {
    throw appError(`${fieldName} inválido`, 400, "ValidationError");
  }
  return value;
}

export function sanitizeEmail(email, required = true) {
  const value = sanitizeString(email, { lower: true, maxLength: 320 });
  if (!value) {
    if (!required) return "";
    throw appError("email requerido", 400, "ValidationError");
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(value)) {
    throw appError("email inválido", 400, "ValidationError");
  }

  return value;
}

export function sanitizeBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  const normalized = sanitizeString(value, { lower: true });
  if (["true", "1", "yes", "si", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}
