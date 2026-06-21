import crypto from "crypto";
import { prisma, tenantPrisma, type TenantPrismaClient } from "@/lib/prisma";
import type { QuoteSendChannel, QuoteStatus } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity-log";
import { sendQuoteEmail } from "@/lib/email";
import { buildWhatsAppLink, quoteWhatsAppMessage } from "@/lib/whatsapp";

// ── Token generation ────────────────────────────────────────────────

const TOKEN_LENGTH = 32; // 256 bits of entropy

export async function generateQuotePublicToken(quoteId: string): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = crypto.randomBytes(TOKEN_LENGTH).toString("hex");

    try {
      await prisma.quote.update({
        where: { id: quoteId },
        data: { publicToken: token },
      });
      return token;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        // Unique constraint violation — retry
        continue;
      }
      throw err;
    }
  }

  throw new Error("Falha ao gerar token público após múltiplas tentativas");
}

export async function getOrCreateQuotePublicToken(quoteId: string): Promise<string> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { publicToken: true },
  });

  if (quote?.publicToken) {
    return quote.publicToken;
  }

  return generateQuotePublicToken(quoteId);
}

// ── Send quote ──────────────────────────────────────────────────────

export interface SendQuoteResult {
  success: boolean;
  channel: QuoteSendChannel;
  whatsappLink?: string | null;
  error?: string;
}

export async function sendQuote(
  tenant: TenantPrismaClient,
  quoteId: string,
  channel: QuoteSendChannel,
  userId: string,
  userName: string
): Promise<SendQuoteResult> {
  const quote = await tenant.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      company: { select: { name: true, tradeName: true } },
    },
  });

  if (!quote) {
    return { success: false, channel, error: "Orcamento nao encontrado" };
  }

  // Validate status
  if (quote.status === "APPROVED" || quote.status === "REJECTED" || quote.status === "EXPIRED") {
    return { success: false, channel, error: "Orcamento em estado final nao pode ser enviado" };
  }

  // Get or create public token
  const publicToken = await getOrCreateQuotePublicToken(quoteId);
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/orcamento/${publicToken}`;

  if (channel === "EMAIL") {
    // Validate email
    if (!quote.customer.email) {
      return { success: false, channel, error: "Cliente sem e-mail cadastrado" };
    }

    // Send email (NOT fire-and-forget)
    const emailResult = await sendQuoteEmail(
      quote.customer.email,
      quote.customer.name,
      quote.number,
      quote.company.tradeName || quote.company.name,
      Number(quote.total),
      quote.description || null,
      quote.validUntil || null,
      portalUrl
    );

    if (!emailResult.success) {
      return { success: false, channel, error: emailResult.error || "Erro ao enviar e-mail" };
    }

    // Only mark as SENT if email succeeded
    await tenant.quote.update({
      where: { id: quoteId },
      data: {
        status: "SENT" as QuoteStatus,
        sentAt: new Date(),
        sentVia: "EMAIL" as QuoteSendChannel,
      },
    });

    await logActivity({
      tenant,
      userId,
      userName,
      action: "UPDATE",
      entity: "quote",
      entityId: quoteId,
      details: `Nº ${quote.number} - Enviado por e-mail para ${quote.customer.email}`,
    });

    return { success: true, channel };
  }

  if (channel === "WHATSAPP") {
    // Validate phone
    const phone = quote.customer.whatsapp || quote.customer.phone;
    if (!phone) {
      return { success: false, channel, error: "Cliente sem telefone/WhatsApp cadastrado" };
    }

    const message = quoteWhatsAppMessage(
      quote.customer.name,
      quote.number,
      Number(quote.total),
      quote.company.tradeName || quote.company.name,
      quote.validUntil || null,
      portalUrl
    );

    const whatsappLink = buildWhatsAppLink(phone, message);

    // Mark as SENT
    await tenant.quote.update({
      where: { id: quoteId },
      data: {
        status: "SENT" as QuoteStatus,
        sentAt: new Date(),
        sentVia: "WHATSAPP" as QuoteSendChannel,
      },
    });

    await logActivity({
      tenant,
      userId,
      userName,
      action: "UPDATE",
      entity: "quote",
      entityId: quoteId,
      details: `Nº ${quote.number} - Fluxo WhatsApp aberto para ${phone}`,
    });

    return { success: true, channel, whatsappLink };
  }

  // MANUAL
  await tenant.quote.update({
    where: { id: quoteId },
    data: {
      status: "SENT" as QuoteStatus,
      sentAt: new Date(),
      sentVia: "MANUAL" as QuoteSendChannel,
    },
  });

  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "quote",
    entityId: quoteId,
    details: `Nº ${quote.number} - Marcado como enviado manualmente`,
  });

  return { success: true, channel };
}
