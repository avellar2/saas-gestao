"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, MessageCircle, Phone, Mail } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getStatusLabel,
  getStatusVariant,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  getWarrantyStatus,
} from "@/lib/os-status";
import { buildWhatsAppLink, portalWhatsAppMessage } from "@/lib/whatsapp";
import { OsStatusTimeline } from "@/components/portal/os-status-timeline";
import type { PortalServiceOrder } from "@/lib/portal";

interface PortalOSContentProps {
  data: PortalServiceOrder;
}

function AnimatedCard({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <div
      className={className}
    >
      <Card>{children}</Card>
    </div>
  );
}

export function PortalOSContent({ data }: PortalOSContentProps) {
  const isCancelled = data.status === "CANCELLED";
  const warrantyStatus = getWarrantyStatus(
    data.warrantyEnabled,
    data.warrantyEndDate ? new Date(data.warrantyEndDate) : null
  );
  const whatsappPhone = data.companyWhatsapp || data.companyPhone;
  const whatsappLink = whatsappPhone
    ? buildWhatsAppLink(
        whatsappPhone,
        portalWhatsAppMessage(data.customerName, data.code, data.companyName)
      )
    : null;

  const displayAmount = data.finalAmount ?? data.total;

  return (
    <div className="space-y-6">
      {/* Cancelled Banner */}
      {isCancelled && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/30 px-4 py-3 text-center"
        >
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Esta ordem de serviço foi cancelada
          </p>
        </div>
      )}

      {/* Header Card */}
      <AnimatedCard delay={0} className="border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
                {data.companyName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {data.companyPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {data.companyPhone}
                  </span>
                )}
                {data.companyEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {data.companyEmail}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusVariant(data.status)}`}
                >
                  {getStatusLabel(data.status)}
                </span>
              </div>
              <span className="text-2xl font-bold text-foreground">
                {data.code}
              </span>
            </div>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Timeline */}
      <AnimatedCard delay={0.08} className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Andamento</CardTitle>
        </CardHeader>
        <CardContent>
          <OsStatusTimeline currentStatus={data.status} />
        </CardContent>
      </AnimatedCard>

      {/* Equipment Card */}
      {data.equipmentName ||
      data.equipmentBrand ||
      data.equipmentModel ||
      data.serialNumber ? (
        <AnimatedCard delay={0.16} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Equipamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.equipmentName && (
              <p className="font-medium text-foreground">
                {data.equipmentName}
              </p>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
              {data.equipmentBrand && (
                <p>
                  <span className="font-medium text-foreground">Marca:</span>{" "}
                  {data.equipmentBrand}
                </p>
              )}
              {data.equipmentModel && (
                <p>
                  <span className="font-medium text-foreground">Modelo:</span>{" "}
                  {data.equipmentModel}
                </p>
              )}
              {data.serialNumber && (
                <p>
                  <span className="font-medium text-foreground">N/S:</span>{" "}
                  {data.serialNumber}
                </p>
              )}
              {data.accessories && (
                <p className="col-span-2">
                  <span className="font-medium text-foreground">
                    Acessórios:
                  </span>{" "}
                  {data.accessories}
                </p>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      ) : null}

      {/* Problem / Service Description */}
      {data.problemDescription || data.serviceDescription ? (
        <AnimatedCard delay={0.24} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Descrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {data.problemDescription && (
              <div>
                <p className="font-medium text-foreground mb-1">
                  Problema informado
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {data.problemDescription}
                </p>
              </div>
            )}
            {data.serviceDescription && (
              <div>
                <p className="font-medium text-foreground mb-1">
                  Serviço realizado
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {data.serviceDescription}
                </p>
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      ) : null}

      {/* Items Card */}
      {data.items.length > 0 ? (
        <AnimatedCard delay={0.32} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Itens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Descrição
                    </th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground w-16">
                      Qtd
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">
                      Unitário
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 text-foreground">
                        {item.description}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(displayAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      ) : null}

      {/* Payment Card */}
      <AnimatedCard delay={0.4} className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getPaymentStatusVariant(data.paymentStatus)}`}
            >
              {getPaymentStatusLabel(data.paymentStatus)}
            </span>
          </div>
          <span className="text-xl font-bold text-foreground">
            {formatCurrency(displayAmount)}
          </span>
        </CardContent>
      </AnimatedCard>

      {/* Warranty Card */}
      {data.warrantyEnabled ? (
        <AnimatedCard delay={0.48} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Garantia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${warrantyStatus.variant}`}
              >
                {warrantyStatus.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
              {data.warrantyStartDate && (
                <p>
                  <span className="font-medium text-foreground">Início:</span>{" "}
                  {formatDate(data.warrantyStartDate)}
                </p>
              )}
              {data.warrantyEndDate && (
                <p>
                  <span className="font-medium text-foreground">Validade:</span>{" "}
                  {formatDate(data.warrantyEndDate)}
                </p>
              )}
            </div>
            {data.warrantyTerms && (
              <p className="text-muted-foreground leading-relaxed pt-1">
                {data.warrantyTerms}
              </p>
            )}
          </CardContent>
        </AnimatedCard>
      ) : null}

      {/* Dates Card */}
      <AnimatedCard delay={0.56} className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prazos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Entrada</p>
            <p className="font-medium text-foreground">
              {formatDate(data.receivedAt || data.openedAt)}
            </p>
          </div>
          {data.expectedDeliveryDate && (
            <div>
              <p className="text-muted-foreground mb-1">Previsão</p>
              <p className="font-medium text-foreground">
                {formatDate(data.expectedDeliveryDate)}
              </p>
            </div>
          )}
          {data.completedAt && (
            <div>
              <p className="text-muted-foreground mb-1">Conclusão</p>
              <p className="font-medium text-foreground">
                {formatDate(data.completedAt)}
              </p>
            </div>
          )}
        </CardContent>
      </AnimatedCard>

      {/* Customer Notes Card */}
      {data.customerNotes ? (
        <AnimatedCard delay={0.64} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.customerNotes}
            </p>
          </CardContent>
        </AnimatedCard>
      ) : null}

      {/* Action Buttons */}
      <AnimatedCard delay={0.72}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`/api/public/os/${data.publicToken}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground flex-1"
            >
              <FileDown className="h-4 w-4" />
              Baixar PDF
            </a>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 flex-1"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com a empresa
              </a>
            )}
          </div>
        </CardContent>
      </AnimatedCard>
    </div>
  );
}