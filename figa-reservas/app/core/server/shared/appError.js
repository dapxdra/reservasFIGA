export function appError(message, status = 400, code = "AppError") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function isAppError(error) {
  return Boolean(error && typeof error === "object" && "status" in error);
}
