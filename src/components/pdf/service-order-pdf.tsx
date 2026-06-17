import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

interface CompanyData {
  name: string;
  tradeName?: string | null;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  address?: string | null;
}

interface CustomerData {
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface ServiceOrderItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ServiceOrderData {
  number: number;
  code?: string | null;
  status: string;
  priority?: string;
  problemDescription?: string | null;
  serviceDescription?: string | null;
  equipmentName?: string | null;
  equipmentBrand?: string | null;
  equipmentModel?: string | null;
  serialNumber?: string | null;
  accessories?: string | null;
  total: number;
  finalAmount?: number | null;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  receivedAt?: string | null;
  expectedDeliveryDate?: string | null;
  completedAt?: string | null;
  warrantyEnabled?: boolean;
  warrantyEndDate?: string | null;
  warrantyTerms?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
  openedAt: string;
  finishedAt?: string | null;
  notes?: string | null;
  technicianName?: string | null;
}

interface ServiceOrderPDFProps {
  company: CompanyData;
  customer: CustomerData;
  serviceOrder: ServiceOrderData;
  items: ServiceOrderItemData[];
  isTrial?: boolean;
}

function formatCurrencyPDF(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDatePDF(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    RECEIVED: "Recebida",
    DIAGNOSIS: "Em Diagnóstico",
    WAITING_APPROVAL: "Aguardando Aprovação",
    WAITING_PARTS: "Aguardando Peças",
    IN_PROGRESS: "Em Execução",
    READY: "Pronta",
    DELIVERED: "Entregue",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };
  return map[status] || status;
}

function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    LOW: "Baixa",
    NORMAL: "Normal",
    HIGH: "Alta",
    URGENT: "Urgente",
  };
  return map[priority] || priority;
}

function getPaymentLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    PARTIAL: "Parcial",
    PAID: "Pago",
    CANCELLED: "Cancelado",
  };
  return map[status] || status;
}

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    CASH: "Dinheiro",
    PIX: "PIX",
    CARD: "Cartão",
    TRANSFER: "Transferência",
    OTHER: "Outro",
  };
  return map[method] || method;
}

/* ────────────────────────────────
   PALETA
   ──────────────────────────────── */
const C = {
  pageBg: "#ffffff",
  text: "#1a1a1a",
  textMuted: "#5a5a5a",
  textLight: "#8a8a8a",
  border: "#e5e7eb",
  headerBg: "#f8f9fa",
  tableHeader: "#e9ecef",
  tableAlt: "#f8f9fa",
  accent: "#059669",
  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
  logoPlaceholder: "#e5e7eb",
  logoPlaceholderText: "#9ca3af",
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.text,
    backgroundColor: C.pageBg,
  },

  /* ── Header ── */
  headerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  logoArea: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.logoPlaceholder,
    borderRadius: 6,
    backgroundColor: C.headerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 7,
    color: C.logoPlaceholderText,
    textAlign: "center",
    lineHeight: 1.3,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  companyName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.text,
    marginBottom: 1,
  },
  tradeName: {
    fontSize: 9,
    color: C.textMuted,
    marginBottom: 2,
  },
  companyMeta: {
    fontSize: 7.5,
    color: C.textLight,
    lineHeight: 1.3,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  docCode: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
  },

  /* ── Section ── */
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.headerBg,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.text,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionBody: {
    borderWidth: 1,
    borderColor: C.border,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopWidth: 0,
    padding: 8,
    backgroundColor: C.pageBg,
  },
  sectionBodyOnly: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: C.pageBg,
  },

  /* ── Info Grid ── */
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
    lineHeight: 1.3,
  },
  infoLabel: {
    fontSize: 8,
    color: C.textLight,
    width: 90,
  },
  infoValue: {
    fontSize: 8,
    color: C.text,
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },
  infoValueNormal: {
    fontSize: 8,
    color: C.text,
    flex: 1,
  },
  subSectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.textMuted,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  descriptionText: {
    fontSize: 8,
    color: C.textMuted,
    lineHeight: 1.4,
  },

  /* ── Table ── */
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.tableHeader,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowAlt: {
    backgroundColor: C.tableAlt,
  },
  tableCell: {
    fontSize: 8,
    color: C.text,
  },
  colDesc: { flex: 4 },
  colQty: { width: 45, textAlign: "center" },
  colPrice: { width: 70, textAlign: "right" },
  colTotal: { width: 70, textAlign: "right" },

  /* ── Totals ── */
  totalsSection: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsBox: {
    width: 200,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  totalRowLast: {
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 8,
    color: C.textMuted,
  },
  totalValue: {
    fontSize: 8,
    color: C.text,
    fontFamily: "Helvetica-Bold",
  },
  totalRowHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: C.accent,
  },
  totalLabelHighlight: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  totalValueHighlight: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },

  /* ── Payment ── */
  paymentTable: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  paymentRowAlt: {
    backgroundColor: C.tableAlt,
  },
  paymentRowLast: {
    borderBottomWidth: 0,
  },
  paymentLabel: {
    fontSize: 8,
    color: C.textMuted,
  },
  paymentValue: {
    fontSize: 8,
    color: C.text,
    fontFamily: "Helvetica-Bold",
  },
  paymentValueAccent: {
    fontSize: 8,
    color: C.accent,
    fontFamily: "Helvetica-Bold",
  },

  /* ── Notes / Warranty ── */
  notesBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 8,
    backgroundColor: C.headerBg,
  },
  notesText: {
    fontSize: 8,
    color: C.textMuted,
    lineHeight: 1.4,
  },
  warningBox: {
    borderWidth: 1,
    borderColor: C.warningBorder,
    borderRadius: 6,
    padding: 8,
    backgroundColor: C.warningBg,
  },

  /* ── Footer ── */
  footer: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: {
    fontSize: 7,
    color: C.textLight,
  },

  /* ── Watermark ── */
  watermark: {
    position: "absolute",
    top: "40%",
    left: "15%",
    transform: "rotate(-35deg)",
    opacity: 0.06,
  },
  watermarkText: {
    fontSize: 72,
    fontFamily: "Helvetica-Bold",
    color: "#ef4444",
  },

  /* ── Misc ── */
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 3,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  badgeGreen: {
    backgroundColor: "#f0fdf4",
    color: C.accent,
  },
  badgeRed: {
    backgroundColor: "#fef2f2",
    color: "#ef4444",
  },
  badgeAmber: {
    backgroundColor: "#fffbeb",
    color: "#b45309",
  },
  badgeBlue: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
  },
  badgeGray: {
    backgroundColor: C.headerBg,
    color: C.textMuted,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  spacer: {
    height: 4,
  },
});

/* ── helpers ── */
function getStatusBadgeStyle(status: string) {
  switch (status) {
    case "COMPLETED":
    case "DELIVERED":
    case "PAID":
      return styles.badgeGreen;
    case "CANCELLED":
      return styles.badgeRed;
    case "READY":
      return styles.badgeBlue;
    case "IN_PROGRESS":
    case "DIAGNOSIS":
      return styles.badgeAmber;
    default:
      return styles.badgeGray;
  }
}

function getPaymentBadgeStyle(status: string) {
  switch (status) {
    case "PAID":
      return styles.badgeGreen;
    case "PARTIAL":
      return styles.badgeAmber;
    case "CANCELLED":
      return styles.badgeRed;
    default:
      return styles.badgeGray;
  }
}

/* ────────────────────────────────
   COMPONENT
   ──────────────────────────────── */
export function ServiceOrderPDF({
  company,
  customer,
  serviceOrder,
  items,
  isTrial,
}: ServiceOrderPDFProps) {
  const remaining = Number(serviceOrder.total) - Number(serviceOrder.paidAmount);
  const showWarranty = serviceOrder.warrantyEnabled;
  const hasItems = items.length > 0;
  const hasEquipment =
    serviceOrder.equipmentName ||
    serviceOrder.equipmentBrand ||
    serviceOrder.equipmentModel ||
    serviceOrder.serialNumber ||
    serviceOrder.accessories;

  return (
    <Document title={`OS #${serviceOrder.number}`} author={company.name}>
      <Page size="A4" style={styles.page}>
        {isTrial && (
          <View style={styles.watermark} fixed>
            <Text style={styles.watermarkText}>PLANO TRIAL</Text>
          </View>
        )}

        {/* ═══════ HEADER ═══════ */}
        <View style={styles.headerBox}>
          <View style={styles.logoArea}>
            <Text style={styles.logoText}>LOGO DA{"\n"}EMPRESA</Text>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.tradeName && (
              <Text style={styles.tradeName}>{company.tradeName}</Text>
            )}
            <View style={styles.companyMeta}>
              {company.phone && <Text>Tel: {company.phone}</Text>}
              {company.email && <Text>{company.email}</Text>}
              {company.document && <Text>CNPJ/CPF: {company.document}</Text>}
              {company.address && <Text>{company.address}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Ordem de Serviço</Text>
            <Text style={styles.docCode}>
              {serviceOrder.code || `#${String(serviceOrder.number).padStart(4, "0")}`}
            </Text>
          </View>
        </View>

        {/* ═══════ OS + CLIENTE ═══════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informações da OS</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Código:</Text>
                  <Text style={styles.infoValue}>
                    {serviceOrder.code || `#${String(serviceOrder.number).padStart(4, "0")}`}
                  </Text>
                </View>
                <View style={[styles.flexRow, { marginBottom: 2 }]}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <View style={[styles.badge, getStatusBadgeStyle(serviceOrder.status)]}>
                    <Text>{getStatusLabel(serviceOrder.status)}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Prioridade:</Text>
                  <Text style={styles.infoValueNormal}>
                    {serviceOrder.priority ? getPriorityLabel(serviceOrder.priority) : "-"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Data de Entrada:</Text>
                  <Text style={styles.infoValueNormal}>
                    {serviceOrder.receivedAt
                      ? formatDatePDF(serviceOrder.receivedAt)
                      : formatDatePDF(serviceOrder.openedAt)}
                  </Text>
                </View>
                {serviceOrder.expectedDeliveryDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Previsão:</Text>
                    <Text style={styles.infoValueNormal}>
                      {formatDatePDF(serviceOrder.expectedDeliveryDate)}
                    </Text>
                  </View>
                )}
                {serviceOrder.completedAt && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Concluída em:</Text>
                    <Text style={styles.infoValueNormal}>
                      {formatDatePDF(serviceOrder.completedAt)}
                    </Text>
                  </View>
                )}
                {serviceOrder.technicianName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Técnico:</Text>
                    <Text style={styles.infoValueNormal}>{serviceOrder.technicianName}</Text>
                  </View>
                )}
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.subSectionTitle}>Cliente</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nome:</Text>
                  <Text style={styles.infoValue}>{customer.name}</Text>
                </View>
                {customer.phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Telefone:</Text>
                    <Text style={styles.infoValueNormal}>{customer.phone}</Text>
                  </View>
                )}
                {customer.email && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>E-mail:</Text>
                    <Text style={styles.infoValueNormal}>{customer.email}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ═══════ EQUIPAMENTO ═══════ */}
        {hasEquipment && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Equipamento</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  {serviceOrder.equipmentName && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Equipamento:</Text>
                      <Text style={styles.infoValueNormal}>{serviceOrder.equipmentName}</Text>
                    </View>
                  )}
                  {serviceOrder.equipmentBrand && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Marca:</Text>
                      <Text style={styles.infoValueNormal}>{serviceOrder.equipmentBrand}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.infoCol}>
                  {serviceOrder.equipmentModel && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Modelo:</Text>
                      <Text style={styles.infoValueNormal}>{serviceOrder.equipmentModel}</Text>
                    </View>
                  )}
                  {serviceOrder.serialNumber && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>N/S:</Text>
                      <Text style={styles.infoValueNormal}>{serviceOrder.serialNumber}</Text>
                    </View>
                  )}
                </View>
              </View>
              {serviceOrder.accessories && (
                <>
                  <View style={styles.spacer} />
                  <Text style={styles.infoLabel}>Acessórios:</Text>
                  <Text style={styles.descriptionText}>{serviceOrder.accessories}</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* ═══════ PROBLEMA ═══════ */}
        {serviceOrder.problemDescription && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Descrição do Problema</Text>
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.descriptionText}>{serviceOrder.problemDescription}</Text>
            </View>
          </View>
        )}

        {/* ═══════ SERVIÇO ═══════ */}
        {serviceOrder.serviceDescription && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Descrição do Serviço</Text>
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.descriptionText}>{serviceOrder.serviceDescription}</Text>
            </View>
          </View>
        )}

        {/* ═══════ PAGAMENTO ═══════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pagamento</Text>
          </View>
          <View style={styles.sectionBodyOnly}>
            <View style={styles.paymentTable}>
              <View style={[styles.paymentRow, styles.paymentRowAlt]}>
                <Text style={styles.paymentLabel}>Status do Pagamento</Text>
                <View style={[styles.badge, getPaymentBadgeStyle(serviceOrder.paymentStatus)]}>
                  <Text>{getPaymentLabel(serviceOrder.paymentStatus)}</Text>
                </View>
              </View>
              {serviceOrder.paymentMethod && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Método</Text>
                  <Text style={styles.paymentValue}>
                    {getPaymentMethodLabel(serviceOrder.paymentMethod)}
                  </Text>
                </View>
              )}
              <View style={[styles.paymentRow, styles.paymentRowAlt]}>
                <Text style={styles.paymentLabel}>Valor Total</Text>
                <Text style={styles.paymentValueAccent}>
                  {formatCurrencyPDF(Number(serviceOrder.total))}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Valor Pago</Text>
                <Text style={styles.paymentValue}>
                  {formatCurrencyPDF(Number(serviceOrder.paidAmount))}
                </Text>
              </View>
              {remaining > 0 && serviceOrder.paymentStatus !== "CANCELLED" && (
                <View style={[styles.paymentRow, styles.paymentRowAlt, styles.paymentRowLast]}>
                  <Text style={styles.paymentLabel}>Valor Restante</Text>
                  <Text style={[styles.paymentValue, { color: "#ef4444" }]}>
                    {formatCurrencyPDF(remaining)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ═══════ GARANTIA ═══════ */}
        {showWarranty && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: C.warningBg, borderColor: C.warningBorder }]}>
              <Text style={styles.sectionTitle}>Garantia</Text>
            </View>
            <View style={styles.warningBox}>
              {serviceOrder.warrantyEndDate && (
                <View style={[styles.flexRow, { justifyContent: "space-between", marginBottom: 2 }]}>
                  <Text style={styles.paymentLabel}>Validade até:</Text>
                  <Text style={styles.paymentValue}>{formatDatePDF(serviceOrder.warrantyEndDate)}</Text>
                </View>
              )}
              {serviceOrder.warrantyTerms && (
                <Text style={styles.notesText}>{serviceOrder.warrantyTerms}</Text>
              )}
            </View>
          </View>
        )}

        {/* ═══════ OBS CLIENTE ═══════ */}
        {serviceOrder.customerNotes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Observações para o Cliente</Text>
            </View>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{serviceOrder.customerNotes}</Text>
            </View>
          </View>
        )}

        {/* ═══════ OBS GERAIS ═══════ */}
        {serviceOrder.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Observações</Text>
            </View>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{serviceOrder.notes}</Text>
            </View>
          </View>
        )}

        {/* ═══════ FOOTER ═══════ */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {company.name} — Documento gerado pelo AVGESTÃO
          </Text>
        </View>
      </Page>

      {/* ═══════ PÁGINA 2: ITENS E SERVIÇOS ═══════ */}
      {hasItems && (
        <Page size="A4" style={styles.page}>
          <View style={[styles.sectionHeader, { marginBottom: 8, borderBottomWidth: 1, borderBottomColor: C.accent, borderRadius: 0, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]}>
            <Text style={[styles.sectionTitle, { fontSize: 11 }]}>Itens e Serviços</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>Descrição</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Qtd</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Preço Unit.</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
            </View>
            {items.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? styles.tableRowAlt : {},
                  index === items.length - 1 ? styles.tableRowLast : {},
                ]}
              >
                <Text style={[styles.tableCell, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{Number(item.quantity)}</Text>
                <Text style={[styles.tableCell, styles.colPrice]}>
                  {formatCurrencyPDF(Number(item.unitPrice))}
                </Text>
                <Text style={[styles.tableCell, styles.colTotal]}>
                  {formatCurrencyPDF(Number(item.total))}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Totals ── */}
          <View style={styles.totalsSection}>
            <View style={styles.totalsBox}>
              {serviceOrder.finalAmount !== null &&
                serviceOrder.finalAmount !== undefined &&
                Number(serviceOrder.finalAmount) !== Number(serviceOrder.total) && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrencyPDF(Number(serviceOrder.total))}
                    </Text>
                  </View>
                )}
              {serviceOrder.finalAmount !== null &&
                serviceOrder.finalAmount !== undefined &&
                Number(serviceOrder.finalAmount) !== Number(serviceOrder.total) && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Valor Final:</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrencyPDF(Number(serviceOrder.finalAmount))}
                    </Text>
                  </View>
                )}
              <View style={styles.totalRowHighlight}>
                <Text style={styles.totalLabelHighlight}>Total:</Text>
                <Text style={styles.totalValueHighlight}>
                  {formatCurrencyPDF(
                    serviceOrder.finalAmount !== null &&
                      serviceOrder.finalAmount !== undefined
                      ? Number(serviceOrder.finalAmount)
                      : Number(serviceOrder.total)
                  )}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              {company.name} — Documento gerado pelo AVGESTÃO
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
