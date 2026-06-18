import { NextResponse } from "next/server";

/**
 * Health check endpoint.
 *
 * - NAO requer autenticacao
 * - NAO expoe dados sensiveis
 * - Usado por Docker healthcheck, Caddy e scripts/smoke-test.sh
 * - Nao conta como "rota publica" no middleware (bypass via x-health-bypass)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: typeof process !== "undefined" ? process.uptime() : 0,
    },
    { status: 200 }
  );
}
