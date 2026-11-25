import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS for the API (Next.js 16 renamed middleware.ts to proxy.ts).
 *
 * Only origins listed in CORS_ORIGIN may call the API from a browser,
 * e.g. CORS_ORIGIN="https://fintrack-web.vercel.app" (comma-separate several).
 * Other origins get no Access-Control-Allow-Origin header, so the browser
 * blocks the response. Never "*".
 *
 * Browsers send an OPTIONS "preflight" before any request carrying an
 * Authorization header or a JSON body; it is answered here with 204.
 */

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "600",
  // Lets the browser app read the pagination total and the CSV file name.
  "Access-Control-Expose-Headers": "X-Total-Count, X-Page, X-Page-Size, Content-Disposition",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isAllowed = allowedOrigins.includes(origin);

  const response =
    request.method === "OPTIONS" ? new NextResponse(null, { status: 204 }) : NextResponse.next();

  // The answer depends on the Origin header, so caches must key on it.
  response.headers.set("Vary", "Origin");
  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
