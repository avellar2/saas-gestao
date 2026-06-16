import type { ServiceOrderStatus, ServiceOrderPriority, PaymentStatus } from "@/generated/prisma/client";

// ── Portal-safe Service Order type ────────────────────────────────────────────

export interface PortalServiceOrder {
  code: string;
  publicToken: string; // safe to include — designed for URLs, never returned by API
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  problemDescription: string | null;
  serviceDescription: string | null;
  equipmentName: string | null;
  equipmentBrand: string | null;
  equipmentModel: string | null;
  serialNumber: string | null;
  accessories: string | null;
  total: number;
  finalAmount: number | null;
  paymentStatus: PaymentStatus;
  receivedAt: string | null;
  expectedDeliveryDate: string | null;
  completedAt: string | null;
  warrantyEnabled: boolean;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  warrantyTerms: string | null;
  customerNotes: string | null;
  openedAt: string;
  customerName: string;
  companyName: string;
  companyPhone: string | null;
  companyWhatsapp: string | null;
  companyEmail: string | null;
  items: PortalServiceOrderItem[];
}

export interface PortalServiceOrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ── Sanitization ───────────────────────────────────────────────────────────────

function toNumber(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return val.toNumber();
}

export function sanitizeServiceOrderForPortal(
  data: {
    number: number;
    code: string | null;
    status: ServiceOrderStatus;
    priority: ServiceOrderPriority;
    problemDescription: string | null;
    serviceDescription: string | null;
    equipmentName: string | null;
    equipmentBrand: string | null;
    equipmentModel: string | null;
    serialNumber: string | null;
    accessories: string | null;
    total: { toNumber(): number } | number;
    finalAmount: { toNumber(): number } | number | null;
    paymentStatus: PaymentStatus;
    receivedAt: Date | null;
    expectedDeliveryDate: Date | null;
    completedAt: Date | null;
    warrantyEnabled: boolean;
    warrantyStartDate: Date | null;
    warrantyEndDate: Date | null;
    warrantyTerms: string | null;
    customerNotes: string | null;
    openedAt: Date;
    publicToken: string | null;
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
): PortalServiceOrder {
  return {
    code: data.code ?? `OS-${String(data.number).padStart(4, "0")}`,
    status: data.status,
    priority: data.priority,
    problemDescription: data.problemDescription,
    serviceDescription: data.serviceDescription,
    equipmentName: data.equipmentName,
    equipmentBrand: data.equipmentBrand,
    equipmentModel: data.equipmentModel,
    serialNumber: data.serialNumber,
    accessories: data.accessories,
    total: toNumber(data.total),
    finalAmount: data.finalAmount != null ? toNumber(data.finalAmount) : null,
    paymentStatus: data.paymentStatus,
    receivedAt: data.receivedAt?.toISOString() ?? null,
    expectedDeliveryDate: data.expectedDeliveryDate?.toISOString() ?? null,
    completedAt: data.completedAt?.toISOString() ?? null,
    warrantyEnabled: data.warrantyEnabled,
    warrantyStartDate: data.warrantyStartDate?.toISOString() ?? null,
    warrantyEndDate: data.warrantyEndDate?.toISOString() ?? null,
    warrantyTerms: data.warrantyTerms,
    customerNotes: data.customerNotes,
    openedAt: data.openedAt.toISOString(),
    customerName: data.customer.name,
    companyName: data.company.tradeName ?? data.company.name,
    companyPhone: data.company.phone,
    companyWhatsapp: data.company.whatsapp,
    companyEmail: data.company.email,
    publicToken: data.publicToken ?? "",
    items: data.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      total: toNumber(item.total),
    })),
  };
}

// ── Timeline status order (CANCELLED shown separately) ─────────────────────────

export const PORTAL_STATUS_ORDER: ServiceOrderStatus[] = [
  "RECEIVED",
  "DIAGNOSIS",
  "WAITING_APPROVAL",
  "WAITING_PARTS",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
  "COMPLETED",
];