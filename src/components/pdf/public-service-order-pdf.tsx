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
  paymentStatus: string;
  receivedAt?: string | null;
  expectedDeliveryDate?: string | null;
  completedAt?: string | null;
  warrantyEnabled?: boolean;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  warrantyTerms?: string | null;
  customerNotes?: string | null;
  openedAt: string;
}

interface PublicServiceOrderPDFProps {
  company: CompanyData;
  customer: CustomerData;
  serviceOrder: ServiceOrderData;
  items: ServiceOrderItemData[];
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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
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
    color: "#059669",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sectionContainer: {
    marginBottom: 16,
  },
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
    width: 110,
  },
  infoValue: {
    fontSize: 9,
    color: "#1a1a1a",
    flex: 1,
  },
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
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  totalsBox: {
    width: 220,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: "#059669",
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
    color: "#059669",
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
  descriptionText: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  paymentBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 4,
    padding: 12,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  paymentLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  paymentValue: {
    fontSize: 9,
    color: "#1a1a1a",
    fontFamily: "Helvetica-Bold",
  },
  notesBox: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 10,
  },
  warrantyBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 4,
    padding: 10,
  },
  notesText: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.5,
  },
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
});

export function PublicServiceOrderPDF({
  company,
  customer,
  serviceOrder,
  items,
}: PublicServiceOrderPDFProps) {
  const showWarranty = serviceOrder.warrantyEnabled;

  return (
    <Document title={`OS #${serviceOrder.number}`} author={company.name}>
      <Page size="A4" style={styles.page}>
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
            <Text style={styles.headerDocTitle}>ORDEM DE SERVICO</Text>
            <Text style={{ fontSize: 10, color: "#6b7280" }}>
              {serviceOrder.code || `#${String(serviceOrder.number).padStart(4, "0")}`}
            </Text>
          </View>
        </View>

        {/* OS Info + Customer */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Informacoes da OS</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Codigo:</Text>
                <Text style={styles.infoValue}>{serviceOrder.code || `#${String(serviceOrder.number).padStart(4, "0")}`}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={styles.infoValue}>{getStatusLabel(serviceOrder.status)}</Text>
              </View>
              {serviceOrder.priority && serviceOrder.priority !== "NORMAL" && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Prioridade:</Text>
                  <Text style={styles.infoValue}>{getPriorityLabel(serviceOrder.priority)}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data de Entrada:</Text>
                <Text style={styles.infoValue}>{serviceOrder.receivedAt ? formatDatePDF(serviceOrder.receivedAt) : formatDatePDF(serviceOrder.openedAt)}</Text>
              </View>
              {serviceOrder.expectedDeliveryDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Previsao de Entrega:</Text>
                  <Text style={styles.infoValue}>{formatDatePDF(serviceOrder.expectedDeliveryDate)}</Text>
                </View>
              )}
              {serviceOrder.completedAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Concluida em:</Text>
                  <Text style={styles.infoValue}>{formatDatePDF(serviceOrder.completedAt)}</Text>
                </View>
              )}
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

        {/* Equipment Section */}
        {(serviceOrder.equipmentName || serviceOrder.equipmentBrand || serviceOrder.equipmentModel || serviceOrder.serialNumber || serviceOrder.accessories) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Equipamento</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoColumn}>
                {serviceOrder.equipmentName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Equipamento:</Text>
                    <Text style={styles.infoValue}>{serviceOrder.equipmentName}</Text>
                  </View>
                )}
                {serviceOrder.equipmentBrand && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Marca:</Text>
                    <Text style={styles.infoValue}>{serviceOrder.equipmentBrand}</Text>
                  </View>
                )}
                {serviceOrder.equipmentModel && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Modelo:</Text>
                    <Text style={styles.infoValue}>{serviceOrder.equipmentModel}</Text>
                  </View>
                )}
                {serviceOrder.serialNumber && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>N/S:</Text>
                    <Text style={styles.infoValue}>{serviceOrder.serialNumber}</Text>
                  </View>
                )}
              </View>
            </View>
            {serviceOrder.accessories && (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.infoLabel}>Acessorios:</Text>
                <Text style={{ ...styles.descriptionText, marginTop: 2 }}>{serviceOrder.accessories}</Text>
              </View>
            )}
          </View>
        )}

        {/* Problem Description */}
        {serviceOrder.problemDescription && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Descricao do Problema</Text>
            <Text style={styles.descriptionText}>{serviceOrder.problemDescription}</Text>
          </View>
        )}

        {/* Service Description */}
        {serviceOrder.serviceDescription && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Descricao do Servico</Text>
            <Text style={styles.descriptionText}>{serviceOrder.serviceDescription}</Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Itens</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Descricao</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qtd</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Preco Unit.</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
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
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total:</Text>
              <Text style={styles.totalValueFinal}>{formatCurrencyPDF(Number(serviceOrder.total))}</Text>
            </View>
            {serviceOrder.finalAmount !== null && serviceOrder.finalAmount !== undefined && Number(serviceOrder.finalAmount) !== Number(serviceOrder.total) && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Valor Final:</Text>
                <Text style={styles.totalValue}>{formatCurrencyPDF(Number(serviceOrder.finalAmount))}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Section — public: status + total only */}
        <View style={[styles.sectionContainer, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Pagamento</Text>
          <View style={styles.paymentBox}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status:</Text>
              <Text style={styles.paymentValue}>{getPaymentLabel(serviceOrder.paymentStatus)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Valor:</Text>
              <Text style={styles.paymentValue}>
                {formatCurrencyPDF(serviceOrder.finalAmount != null ? Number(serviceOrder.finalAmount) : Number(serviceOrder.total))}
              </Text>
            </View>
          </View>
        </View>

        {/* Warranty Section */}
        {showWarranty && (
          <View style={[styles.sectionContainer, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Garantia</Text>
            <View style={styles.warrantyBox}>
              {serviceOrder.warrantyStartDate && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Inicio:</Text>
                  <Text style={styles.paymentValue}>{formatDatePDF(serviceOrder.warrantyStartDate)}</Text>
                </View>
              )}
              {serviceOrder.warrantyEndDate && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Validade:</Text>
                  <Text style={styles.paymentValue}>{formatDatePDF(serviceOrder.warrantyEndDate)}</Text>
                </View>
              )}
              {serviceOrder.warrantyTerms && (
                <Text style={{ ...styles.notesText, marginTop: 4 }}>{serviceOrder.warrantyTerms}</Text>
              )}
            </View>
          </View>
        )}

        {/* Customer Notes */}
        {serviceOrder.customerNotes && (
          <View style={[styles.sectionContainer, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Observacoes para o Cliente</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{serviceOrder.customerNotes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>OS gerada pelo Gestor Local</Text>
        </View>
      </Page>
    </Document>
  );
}