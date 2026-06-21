import type { TenantPrismaClient } from "@/lib/prisma";
import type { QuoteApprovalSource, QuoteStatus } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity-log";

// ── Approve quote (online or physical) ──────────────────────────────

export interface ApproveQuoteParams {
  tenant: TenantPrismaClient;
  quoteId: string;
  source: QuoteApprovalSource;
  userId?: string;
  userName?: string;
  approvedByName?: string;
}

export interface ApproveQuoteResult {
  success: boolean;
  idempotent: boolean;
  error?: string;
}

export async function approveQuote(params: ApproveQuoteParams): Promise<ApproveQuoteResult> {
  const { tenant, quoteId, source, userId, userName, approvedByName } = params;

  const quote = await tenant.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      number: true,
      status: true,
      validUntil: true,
      approvedAt: true,
    },
  });

  if (!quote) {
    return { success: false, idempotent: false, error: "Orcamento nao encontrado" };
  }

  // Idempotency: already approved
  if (quote.status === "APPROVED") {
    return { success: true, idempotent: true };
  }

  // Cannot approve if rejected or expired
  if (quote.status === "REJECTED") {
    return { success: false, idempotent: false, error: "Orcamento foi rejeitado e nao pode ser aprovado" };
  }

  if (quote.status === "EXPIRED") {
    return { success: false, idempotent: false, error: "Orcamento expirado nao pode ser aprovado" };
  }

  // Can only approve SENT quotes online
  if (source === "ONLINE" && quote.status !== "SENT") {
    return { success: false, idempotent: false, error: "Somente orcamentos enviados podem ser aprovados online" };
  }

  // Validate validity for online approval
  if (source === "ONLINE" && quote.validUntil && new Date() > new Date(quote.validUntil)) {
    return { success: false, idempotent: false, error: "Orcamento fora do prazo de validade" };
  }

  const now = new Date();

  // Get full quote data to create financial transaction
  const fullQuote = await tenant.quote.findUnique({
    where: { id: quoteId },
    include: { customer: { select: { id: true, name: true } } },
  });

  if (!fullQuote) {
    return { success: false, idempotent: false, error: "Orcamento nao encontrado" };
  }

  await tenant.quote.update({
    where: { id: quoteId },
    data: {
      status: "APPROVED" as QuoteStatus,
      approvedAt: now,
      approvalSource: source,
      approvedByUserId: userId || null,
      approvedByName: approvedByName || null,
    },
  });

  // Create financial transaction (accounts receivable)
  // Idempotent: check if already exists for this quote
  const existingTx = await tenant.financialTransaction.findFirst({
    where: { quoteId },
  });

  if (!existingTx) {
    const dueDate = fullQuote.validUntil
      ? new Date(fullQuote.validUntil)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    await tenant.financialTransaction.create({
      data: {
        companyId: fullQuote.companyId,
        type: "RECEIVABLE",
        description: `Orcamento #${String(fullQuote.number).padStart(4, "0")} - ${fullQuote.customer.name}`,
        category: "Servicos",
        amount: fullQuote.total,
        dueDate,
        status: "PENDING",
        customerId: fullQuote.customerId,
        quoteId: fullQuote.id,
        notes: `Gerado automaticamente pela aprovacao do orcamento #${String(fullQuote.number).padStart(4, "0")}`,
      },
    });
  }

  const sourceLabel = source === "ONLINE" ? "online" : "presencial";
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "quote",
    entityId: quoteId,
    details: `Nº ${quote.number} - Aprovado ${sourceLabel}${approvedByName ? ` por ${approvedByName}` : ""}`,
  });

  return { success: true, idempotent: false };
}

// ── Reject quote ────────────────────────────────────────────────────

export interface RejectQuoteParams {
  tenant: TenantPrismaClient;
  quoteId: string;
  reason?: string;
}

export interface RejectQuoteResult {
  success: boolean;
  idempotent: boolean;
  error?: string;
}

export async function rejectQuote(params: RejectQuoteParams): Promise<RejectQuoteResult> {
  const { tenant, quoteId, reason } = params;

  const quote = await tenant.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      number: true,
      status: true,
      rejectedAt: true,
    },
  });

  if (!quote) {
    return { success: false, idempotent: false, error: "Orcamento nao encontrado" };
  }

  // Idempotency: already rejected
  if (quote.status === "REJECTED") {
    return { success: true, idempotent: true };
  }

  // Cannot reject if already approved or expired
  if (quote.status === "APPROVED") {
    return { success: false, idempotent: false, error: "Orcamento aprovado nao pode ser rejeitado" };
  }

  if (quote.status === "EXPIRED") {
    return { success: false, idempotent: false, error: "Orcamento expirado nao pode ser rejeitado" };
  }

  const sanitizedReason = reason?.trim().slice(0, 500) || null;

  await tenant.quote.update({
    where: { id: quoteId },
    data: {
      status: "REJECTED" as QuoteStatus,
      rejectedAt: new Date(),
      approvalSource: "ONLINE" as QuoteApprovalSource,
      rejectionReason: sanitizedReason,
    },
  });

  await logActivity({
    tenant,
    action: "UPDATE",
    entity: "quote",
    entityId: quoteId,
    details: `Nº ${quote.number} - Rejeitado${sanitizedReason ? `: ${sanitizedReason}` : ""}`,
  });

  return { success: true, idempotent: false };
}
