import type { ErrorDetail } from "./types";

/**
 * The single place the app talks HTTP. It:
 *  - prefixes VITE_API_URL,
 *  - attaches the JWT as "Authorization: Bearer",
 *  - turns the API's { error: { code, message, details } } body into an ApiError,
 *  - reports 401s so the app can log out (see AuthContext).
 */

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "fintrack.token";

/** An error response from the API, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetail[];

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** The message for one form field, if the API reported one. */
  fieldError(field: string): string | undefined {
    return this.details.find((d) => d.field === field)?.message;
  }
}

// ---- token storage: in memory, mirrored to localStorage so a refresh keeps you logged in ----
let token: string | null = readStoredToken();

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage blocked (private mode etc.): stay logged out
  }
}

export function getToken() {
  return token;
}

export function setToken(next: string | null) {
  token = next;
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore: the in-memory token still works for this tab
  }
}

// ---- 401 handling: AuthContext registers what to do when the session is no longer valid ----
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown };

/**
 * Downloads a file from the API (e.g. the CSV export). A plain <a href> can't send the
 * Authorization header, so the file is fetched here and handed to the browser as a blob.
 */
export async function apiDownload(path: string, fallbackName: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null))?.error;
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, err?.code ?? "UNKNOWN_ERROR", err?.message ?? `Download failed (${res.status}).`);
  }

  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function api<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = data?.error;
    const apiError = new ApiError(
      res.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? `Request failed (${res.status}).`,
      err?.details ?? [],
    );
    // A 401 on a logged-in request means the token expired or was revoked.
    // (A 401 from the login form itself is just a wrong password.)
    if (res.status === 401 && token && !path.startsWith("/api/auth/")) onUnauthorized?.();
    throw apiError;
  }

  return data as T;
}
