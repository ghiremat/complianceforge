import { NextResponse } from "next/server";

function allowedOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return "*";
}

export function addCorsHeaders(response: NextResponse, request: Request): NextResponse {
  const o = allowedOrigin(request);
  response.headers.set("Access-Control-Allow-Origin", o);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With, X-Api-Key"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export function handleCorsPreFlight(request: Request): NextResponse {
  return addCorsHeaders(new NextResponse(null, { status: 204 }), request);
}
