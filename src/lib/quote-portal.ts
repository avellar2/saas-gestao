import type { QuoteStatus, QuoteSendChannel, QuoteApprovalSource } from "@/generated/prisma/client";

// ── Portal-safe Quote type ──────────────────────────────────────────

export interface PortalQuote {
  publicToken: string;
  number: number;
  status: QuoteStatus;
  description: string | null;
  total: number;
  discount: number;
  subtotal: number;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  sentAt: string | null;
  sentVia: QuoteSendChannel | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  approvalSource: QuoteApprovalSource | null;
  rejectionReason: string | null;
  customerName: string;
  companyName: string;
  companyPhone: string | null;
  companyWhatsapp: string | null;
  companyEmail: string | null;
  items: PortalQuoteItem[];
}

export interface PortalQuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function toNumber(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return val.toNumber();
}

// ── Sanitization ────────────────────────────────────────────────────

export function sanitizeQuoteForPortal(
  data: {
    number: number;
    status: QuoteStatus;
    description: string | null;
    subtotal: { toNumber(): number } | number;
    discount: { toNumber(): number } | number;
    total: { toNumber(): number } | number;
    validUntil: Date | null;
    notes: string | null;
    createdAt: Date;
    publicToken: string | null;
    sentAt: Date | null;
    sentVia: QuoteSendChannel | null;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    approvalSource: QuoteApprovalSource | null;
    rejectionReason: string | null;
    company: {
      name: string;
      tradeName: string | null;
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
    };
    customer: { name: string };
    items: Array<{
      description: string;
      quantity: { toNumber(): number } | number;
      unitPrice: { toNumber(): number } | number;
      total: { toNumber(): number } | number;
    }>;
  }
): PortalQuote {
  return {
    publicToken: data.publicToken ?? "",
    number: data.number,
    status: data.status,
    description: data.description,
    subtotal: toNumber(data.subtotal),
    discount: toNumber(data.discount),
    total: toNumber(data.total),
    validUntil: data.validUntil?.toISOString() ?? null,
    notes: data.notes,
    createdAt: data.createdAt.toISOString(),
    sentAt: data.sentAt?.toISOString() ?? null,
    sentVia: data.sentVia,
    approvedAt: data.approvedAt?.toISOString() ?? null,
    rejectedAt: data.rejectedAt?.toISOString() ?? null,
    approvalSource: data.approvalSource,
    rejectionReason: data.rejectionReason,
    customerName: data.customer.name,
    companyName: data.company.tradeName ?? data.company.name,
    companyPhone: data.company.phone,
    companyWhatsapp: data.company.whatsapp,
    companyEmail: data.company.email,
    items: data.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      total: toNumber(item.total),
    })),
  };
}
