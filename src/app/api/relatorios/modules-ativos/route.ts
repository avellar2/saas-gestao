import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveModules } from "@/lib/module-guard";

/**
 * Endpoint leve para obter apenas os módulos ativos.
 * Usado pelo layout de relatórios para mostrar/esconder abas.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const activeModules = await getActiveModules(companyId);

  return NextResponse.json({ activeModules });
}
