import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "INSUFFICIENT_HOLDINGS"
  | "INTERNAL_ERROR";

export type ErrorDetail = { field: string; message: string };

/** Every error response has this shape: { error: { code, message, details? } } */
export type ErrorBody = {
  error: { code: ErrorCode; message: string; details?: ErrorDetail[] };
};

/** Throw this from any route or lib function; handle() turns it into a JSON response. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const notFound = (what: string) =>
  new ApiError(404, "NOT_FOUND", `${what} not found.`);

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
) {
  const body: ErrorBody = { error: { code, message, ...(details && { details }) } };
  return Response.json(body, { status });
}

function toResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return errorResponse(err.status, err.code, err.message, err.details);
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));
    return errorResponse(422, "VALIDATION_ERROR", "The request has invalid fields.", details);
  }
  // Unknown failure: log it server-side, never leak the stack trace to the client.
  console.error(err);
  return errorResponse(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/**
 * Wraps a route handler so every thrown error becomes the same JSON error shape.
 * Usage: export const GET = handle(async (req, ctx) => { ... });
 */
export function handle<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return toResponse(err);
    }
  };
}

/** Parses a JSON body; malformed JSON is a 400, not a 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }
}

/** Route ids are integers; anything else is treated as not found. */
export function parseId(raw: string, what: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw notFound(what);
  return id;
}
