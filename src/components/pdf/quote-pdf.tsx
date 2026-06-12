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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  // Header
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  headerLeft: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  tradeName: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 6,
  },
  headerInfo: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerDocTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  // Sections
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sectionContainer: {
    marginBottom: 16,
  },
  // Info grid
  infoGrid: {
    flexDirection: "row",
    gap: 20,
  },
  infoColumn: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
    lineHeight: 1.5,
  },
  infoLabel: {
    fontSize: 9,
    color: "#6b7280",
    width: 90,
  },
  infoValue: {
    fontSize: 9,
    color: "#1a1a1a",
    flex: 1,
  },
  // Items table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  colDesc: {
    flex: 4,
  },
  colQty: {
    width: 60,
    textAlign: "center",
  },
  colPrice: {
    width: 90,
    textAlign: "right",
  },
  colTotal: {
    width: 90,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableRowCell: {
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: "#fafbfc",
  },
  // Totals
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  totalsBox: {
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  totalLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 9,
    color: "#1a1a1a",
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: "#2563eb",
    marginTop: 4,
  },
  totalLabelFinal: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  totalValueFinal: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
  },
  // Notes
  notesText: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  // Watermark
  watermark: {
    position: "absolute",
    top: "40%",
    left: "15%",
    transform: "rotate(-35deg)",
    opacity: 0.08,
  },
  watermarkText: {
    fontSize: 72,
    fontFamily: "Helvetica-Bold",
    color: "#ef4444",
  },
});

export function QuotePDF({ company, customer, quote, items, isTrial }: QuotePDFProps) {
  return (
    <Document title={`Orcamento #${quote.number}`} author={company.name}>
      <Page size="A4" style={styles.page}>
        {/* Trial Watermark */}
        {isTrial && (
          <View style={styles.watermark} fixed>
            <Text style={styles.watermarkText}>PLANO TRIAL</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.tradeName && (
              <Text style={styles.tradeName}>{company.tradeName}</Text>
            )}
            <View style={styles.headerInfo}>
              {company.phone && <Text>Tel: {company.phone}</Text>}
              {company.email && <Text>{company.email}</Text>}
              {company.document && <Text>CNPJ/CPF: {company.document}</Text>}
              {company.address && <Text>{company.address}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDocTitle}>ORCAMENTO</Text>
            <Text style={{ fontSize: 10, color: "#6b7280" }}>
              #{String(quote.number).padStart(4, "0")}
            </Text>
          </View>
        </View>

        {/* Quote + Customer Info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Informacoes do Orcamento</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Numero:</Text>
                <Text style={styles.infoValue}>#{String(quote.number).padStart(4, "0")}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data:</Text>
                <Text style={styles.infoValue}>{formatDatePDF(quote.createdAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Validade:</Text>
                <Text style={styles.infoValue}>
                  {quote.validUntil ? formatDatePDF(quote.validUntil) : "-"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={styles.infoValue}>{getStatusLabel(quote.status)}</Text>
              </View>
            </View>
            <View style={styles.infoColumn}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#374151" }}>
                Cliente
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nome:</Text>
                <Text style={styles.infoValue}>{customer.name}</Text>
              </View>
              {customer.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Telefone:</Text>
                  <Text style={styles.infoValue}>{customer.phone}</Text>
                </View>
              )}
              {customer.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>E-mail:</Text>
                  <Text style={styles.infoValue}>{customer.email}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Description */}
        {quote.description && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Descricao</Text>
            <Text style={styles.notesText}>{quote.description}</Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Itens</Text>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Descricao</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qtd</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Preco Unit.</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          {/* Table Rows */}
          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.tableRowCell, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.tableRowCell, styles.colQty]}>{Number(item.quantity)}</Text>
              <Text style={[styles.tableRowCell, styles.colPrice]}>
                {formatCurrencyPDF(Number(item.unitPrice))}
              </Text>
              <Text style={[styles.tableRowCell, styles.colTotal]}>
                {formatCurrencyPDF(Number(item.total))}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrencyPDF(Number(quote.subtotal))}</Text>
            </View>
            {Number(quote.discount) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Desconto:</Text>
                <Text style={styles.totalValue}>- {formatCurrencyPDF(Number(quote.discount))}</Text>
              </View>
            )}
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total:</Text>
              <Text style={styles.totalValueFinal}>{formatCurrencyPDF(Number(quote.total))}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={[styles.sectionContainer, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Observacoes</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Orcamento gerado pelo Gestor Local</Text>
        </View>
      </Page>
    </Document>
  );
}