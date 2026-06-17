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

interface QuoteItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteData {
  number: number;
  status: string;
  description?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  validUntil?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface QuotePDFProps {
  company: CompanyData;
  customer: CustomerData;
  quote: QuoteData;
  items: QuoteItemData[];
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
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Rascunho";
    case "SENT":
      return "Enviado";
    case "APPROVED":
      return "Aprovado";
    case "REJECTED":
      return "Rejeitado";
    case "EXPIRED":
      return "Expirado";
    default:
      return status;
  }
}

/* ────────────────────────────────
   PALETA (azul para orçamentos)
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
  accent: "#2563eb",
  accentLight: "#eff6ff",
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
    marginBottom: 10,
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
    color: "#059669",
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
    backgroundColor: C.accentLight,
    color: C.accent,
  },
  badgeGray: {
    backgroundColor: C.headerBg,
    color: C.textMuted,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
  },
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
});

/* ── helpers ── */
function getStatusBadgeStyle(status: string) {
  switch (status) {
    case "APPROVED":
      return styles.badgeGreen;
    case "SENT":
      return styles.badgeBlue;
    case "REJECTED":
      return styles.badgeRed;
    case "EXPIRED":
      return styles.badgeAmber;
    default:
      return styles.badgeGray;
  }
}

/* ────────────────────────────────
   COMPONENT — 1 página, tudo junto
   ──────────────────────────────── */
export function QuotePDF({
  company,
  customer,
  quote,
  items,
  isTrial,
}: QuotePDFProps) {
  const hasItems = items.length > 0;

  return (
    <Document title={`Orçamento #${quote.number}`} author={company.name}>
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
            <Text style={styles.docTitle}>Orçamento</Text>
            <Text style={styles.docCode}>
              #{String(quote.number).padStart(4, "0")}
            </Text>
          </View>
        </View>

        {/* ═══════ ORÇAMENTO + CLIENTE ═══════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informações do Orçamento</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Número:</Text>
                  <Text style={styles.infoValue}>#{String(quote.number).padStart(4, "0")}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Data:</Text>
                  <Text style={styles.infoValueNormal}>{formatDatePDF(quote.createdAt)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Validade:</Text>
                  <Text style={styles.infoValueNormal}>
                    {quote.validUntil ? formatDatePDF(quote.validUntil) : "-"}
                  </Text>
                </View>
                <View style={[styles.flexRow, { marginBottom: 2 }]}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <View style={[styles.badge, getStatusBadgeStyle(quote.status)]}>
                    <Text>{getStatusLabel(quote.status)}</Text>
                  </View>
                </View>
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

        {/* ═══════ DESCRIÇÃO ═══════ */}
        {quote.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Descrição</Text>
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.descriptionText}>{quote.description}</Text>
            </View>
          </View>
        )}

        {/* ═══════ ITENS (tudo junto, não quebra no meio) ═══════ */}
        {hasItems && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Itens e Serviços</Text>
            </View>
            <View style={styles.sectionBodyOnly}>
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

              {/* ── Totals (junto com a tabela, não separa) ── */}
              <View style={styles.totalsSection}>
                <View style={styles.totalsBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrencyPDF(Number(quote.subtotal))}
                    </Text>
                  </View>
                  {Number(quote.discount) > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Desconto:</Text>
                      <Text style={[styles.totalValue, { color: "#ef4444" }]}>
                        - {formatCurrencyPDF(Number(quote.discount))}
                      </Text>
                    </View>
                  )}
                  <View style={styles.totalRowHighlight}>
                    <Text style={styles.totalLabelHighlight}>Total:</Text>
                    <Text style={styles.totalValueHighlight}>
                      {formatCurrencyPDF(Number(quote.total))}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ═══════ OBSERVAÇÕES ═══════ */}
        {quote.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Observações</Text>
            </View>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{quote.notes}</Text>
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
    </Document>
  );
}
