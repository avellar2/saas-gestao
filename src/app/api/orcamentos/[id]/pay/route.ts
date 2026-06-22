import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

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

  // Find quote
  const quote = await tenant.quote.findUnique({
    where: { id },
  });

  if (!quote) {
    return NextResponse.json({ error: "Orcamento nao encontrado" }, { status: 404 });
  }

  // Only APPROVED quotes can be paid
  if (quote.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Apenas orcamentos aprovados podem ser pagos" },
      { status: 400 }
    );
  }

  // Find the financial transaction for this quote
  const transaction = await tenant.financialTransaction.findFirst({
    where: { quoteId: id },
  });

  if (!transaction) {
    return NextResponse.json(
      { error: "Transacao financeira nao encontrada para este orcamento" },
      { status: 404 }
    );
  }

  // Check if already paid
  if (transaction.status === "PAID") {
    return NextResponse.json(
      { success: true, idempotent: true, paidAt: transaction.paidAt },
      { status: 200 }
    );
  }

  const body = await request.json();
  const { paymentMethod, paidAt } = body as {
    paymentMethod?: string;
    paidAt?: string;
  };

  const paidAtDate = paidAt ? new Date(paidAt) : new Date();

  // Update the financial transaction
  await tenant.financialTransaction.update({
    where: { id: transaction.id },
    data: {
      status: "PAID",
      paidAt: paidAtDate,
    },
  });

  // Update the quote with payment info
  await tenant.quote.update({
    where: { id },
    data: {
      notes: quote.notes
        ? `${quote.notes}\n[Pago em ${paidAtDate.toLocaleDateString("pt-BR")}${paymentMethod ? ` via ${paymentMethod}` : ""}]`
        : `[Pago em ${paidAtDate.toLocaleDateString("pt-BR")}${paymentMethod ? ` via ${paymentMethod}` : ""}]`,
    },
  });

  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "quote",
    entityId: id,
    details: `Nº ${quote.number} - Pagamento registrado${paymentMethod ? ` via ${paymentMethod}` : ""}`,
  });

  return NextResponse.json({
    success: true,
    idempotent: false,
    paidAt: paidAtDate.toISOString(),
  });
}
