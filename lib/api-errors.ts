import { NextResponse } from "next/server";
import type { ZodError } from "zod";

interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

export function apiError(message: string, code: string, status: number, details?: unknown) {
  const body: ApiErrorBody = { error: message, code };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function unauthorized(message = "Authentication required") {
  return apiError(message, "UNAUTHORIZED", 401);
}

export function forbidden(message = "Insufficient permissions") {
  return apiError(message, "FORBIDDEN", 403);
}

export function notFound(resource = "Resource") {
  return apiError(`${resource} not found`, "NOT_FOUND", 404);
}

export function badRequest(message: string, details?: unknown) {
  return apiError(message, "BAD_REQUEST", 400, details);
}

export function validationError(error: ZodError) {
  return apiError(
    "Validation failed",
    "VALIDATION_ERROR",
    400,
    error.issues.map((e) => ({
      path: e.path.map(String).join(".") || "(root)",
      message: e.message,
    }))
  );
}

export function serverError(message = "Internal server error") {
  return apiError(message, "INTERNAL_ERROR", 500);
}

export function rateLimited(message = "Too many requests. Please try again later.") {
  return apiError(message, "RATE_LIMITED", 429);
}

export function conflict(message: string, details?: unknown) {
  return apiError(message, "CONFLICT", 409, details);
}
