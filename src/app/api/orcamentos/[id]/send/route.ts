import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { sendQuote } from "@/lib/quote-send";
import type { QuoteSendChannel } from "@/generated/prisma/client";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;

  const hasAccess = await checkModuleAccess(companyId, "quotes");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const body = await request.json();
  const { channel } = body as { channel?: string };

  if (!channel || !["EMAIL", "WHATSAPP", "MANUAL"].includes(channel)) {
    return NextResponse.json(
      { error: "Canal invalido. Use EMAIL, WHATSAPP ou MANUAL" },
      { status: 400 }
    );
  }

  try {
    const result = await sendQuote(
      tenant,
      id,
      channel as QuoteSendChannel,
      userId,
      userName
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response: Record<string, unknown> = {
      success: true,
      channel: result.channel,
    };

    if (result.whatsappLink) {
      response.whatsappLink = result.whatsappLink;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("Send quote error:", err);
    return NextResponse.json(
      { error: `Erro interno ao enviar orcamento: ${err instanceof Error ? err.message : "erro desconhecido"}` },
      { status: 500 }
    );
  }
}
