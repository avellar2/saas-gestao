"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import {
  SERVICE_ORDER_PRIORITY,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
} from "@/lib/os-status";

export interface ServiceOrderItemData {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ServiceOrderFormData {
  customerId: string;
  quoteId: string;
  problemDescription: string;
  serviceDescription: string;
  equipmentName: string;
  equipmentBrand: string;
  equipmentModel: string;
  serialNumber: string;
  accessories: string;
  priority: string;
  expectedDeliveryDate: string;
  warrantyEnabled: boolean;
  warrantyTerms: string;
  internalNotes: string;
  customerNotes: string;
  notes: string;
  items: ServiceOrderItemData[];
}

interface CustomerOption {
  id: string;
  name: string;
}

interface QuoteOption {
  id: string;
  number: number;
  customerName: string;
}

interface ServiceOrderFormProps {
  customers: CustomerOption[];
  quotes?: QuoteOption[];
  initialData?: Partial<ServiceOrderFormData>;
  onSubmit: (data: ServiceOrderFormData) => Promise<void>;
  submitLabel?: string;
  readOnly?: boolean;
  paymentStatus?: string;
  paymentMethod?: string;
  paidAmount?: number;
  total?: number;
  warrantyEnabled?: boolean;
  warrantyEndDate?: string | null;
}

export function ServiceOrderForm({
  customers,
  quotes,
  initialData,
  onSubmit,
  submitLabel = "Salvar",
  readOnly = false,
  paymentStatus,
  paymentMethod,
  paidAmount,
  total: existingTotal,
  warrantyEnabled: existingWarrantyEnabled,
  warrantyEndDate,
}: ServiceOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ServiceOrderFormData>({
    customerId: initialData?.customerId || "",
    quoteId: initialData?.quoteId || "",
    problemDescription: initialData?.problemDescription || "",
    serviceDescription: initialData?.serviceDescription || "",
    equipmentName: initialData?.equipmentName || "",
    equipmentBrand: initialData?.equipmentBrand || "",
    equipmentModel: initialData?.equipmentModel || "",
    serialNumber: initialData?.serialNumber || "",
    accessories: initialData?.accessories || "",
    priority: initialData?.priority || "NORMAL",
    expectedDeliveryDate: initialData?.expectedDeliveryDate || "",
    warrantyEnabled: initialData?.warrantyEnabled ?? false,
    warrantyTerms: initialData?.warrantyTerms || "",
    internalNotes: initialData?.internalNotes || "",
    customerNotes: initialData?.customerNotes || "",
    notes: initialData?.notes || "",
    items: initialData?.items || [
      { description: "", quantity: 1, unitPrice: 0 },
    ],
  });

  function handleChange(
    field: keyof ServiceOrderFormData,
    value: string | number | boolean | ServiceOrderItemData[]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleItemChange(
    index: number,
    field: keyof ServiceOrderItemData,
    value: string | number
  ) {
    const newItems = [...formData.items];
    if (field === "description") {
      newItems[index] = { ...newItems[index], description: value as string };
    } else if (field === "quantity") {
      newItems[index] = {
        ...newItems[index],
        quantity: parseFloat(value as string) || 0,
      };
    } else if (field === "unitPrice") {
      newItems[index] = {
        ...newItems[index],
        unitPrice: parseFloat(value as string) || 0,
      };
    }
    handleChange("items", newItems);
  }

  function addItem() {
    handleChange("items", [
      ...formData.items,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(index: number) {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    handleChange("items", newItems);
  }

  const calculatedTotal = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informacoes da Ordem de Servico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Cliente *</Label>
              {readOnly ? (
                <Input
                  value={
                    customers.find((c) => c.id === formData.customerId)
                      ?.name || ""
                  }
                  readOnly
                />
              ) : (
                <Select
                  value={formData.customerId}
                  onValueChange={(value: string | null) =>
                    handleChange("customerId", value || "")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {quotes && quotes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="quoteId">Orcamento Vinculado</Label>
                {readOnly ? (
                  <Input
                    value={
                      formData.quoteId
                        ? quotes.find((q) => q.id === formData.quoteId)
                            ? `#${quotes.find((q) => q.id === formData.quoteId)?.number} - ${quotes.find((q) => q.id === formData.quoteId)?.customerName}`
                            : "-"
                        : "Nenhum"
                    }
                    readOnly
                  />
                ) : (
                  <Select
                    value={formData.quoteId || "none"}
                    onValueChange={(value: string | null) =>
                      handleChange("quoteId", (value === "none" || !value) ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Nenhum orcamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {quotes.map((quote) => (
                        <SelectItem key={quote.id} value={quote.id}>
                          #{quote.number} - {quote.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              {readOnly ? (
                <Input
                  value={SERVICE_ORDER_PRIORITY.find(p => p.value === formData.priority)?.label || formData.priority}
                  readOnly
                />
              ) : (
                <Select
                  value={formData.priority}
                  onValueChange={(value: string | null) =>
                    handleChange("priority", value || "NORMAL")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_ORDER_PRIORITY.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDeliveryDate">Previsao de Entrega</Label>
              <Input
                type="date"
                id="expectedDeliveryDate"
                value={formData.expectedDeliveryDate}
                onChange={(e) => handleChange("expectedDeliveryDate", e.target.value)}
                readOnly={readOnly}
              />
            </div>
          </div>

          {paymentStatus && (
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-muted-foreground">Pagamento:</span>
              <Badge variant={getPaymentStatusVariant(paymentStatus as any) as "default" | "secondary" | "destructive" | "outline"}>
                {getPaymentStatusLabel(paymentStatus as any)}
              </Badge>
              {paymentMethod && (
                <span className="text-muted-foreground">
                  Metodo: {PAYMENT_METHOD.find(p => p.value === paymentMethod)?.label || paymentMethod}
                </span>
              )}
              {paidAmount !== undefined && existingTotal !== undefined && (
                <span>
                  {formatCurrency(paidAmount)} / {formatCurrency(existingTotal)}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Equipamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipmentName">Nome do Equipamento</Label>
              <Input
                id="equipmentName"
                value={formData.equipmentName}
                onChange={(e) => handleChange("equipmentName", e.target.value)}
                readOnly={readOnly}
                placeholder="Ex: Notebook, Celular, Maquina de lavar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipmentBrand">Marca</Label>
              <Input
                id="equipmentBrand"
                value={formData.equipmentBrand}
                onChange={(e) => handleChange("equipmentBrand", e.target.value)}
                readOnly={readOnly}
                placeholder="Ex: Samsung, Dell, Electrolux"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipmentModel">Modelo</Label>
              <Input
                id="equipmentModel"
                value={formData.equipmentModel}
                onChange={(e) => handleChange("equipmentModel", e.target.value)}
                readOnly={readOnly}
                placeholder="Ex: Galaxy S24, Inspiron 15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Numero de Serie</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => handleChange("serialNumber", e.target.value)}
                readOnly={readOnly}
                placeholder="Numero de serie do equipamento"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessories">Acessorios Recebidos</Label>
            <Textarea
              id="accessories"
              value={formData.accessories}
              onChange={(e) => handleChange("accessories", e.target.value)}
              readOnly={readOnly}
              placeholder="Liste os acessorios recebidos junto com o equipamento (carregador, cabo, caixa, etc.)"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Problem + Service Description */}
      <Card>
        <CardHeader>
          <CardTitle>Descricao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="problemDescription">Descricao do Problema</Label>
            <Textarea
              id="problemDescription"
              value={formData.problemDescription}
              onChange={(e) =>
                handleChange("problemDescription", e.target.value)
              }
              readOnly={readOnly}
              placeholder="Descreva o problema relatado pelo cliente"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceDescription">Descricao do Servico</Label>
            <Textarea
              id="serviceDescription"
              value={formData.serviceDescription}
              onChange={(e) =>
                handleChange("serviceDescription", e.target.value)
              }
              readOnly={readOnly}
              placeholder="Descreva o servico a ser realizado"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Itens
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-4 mr-1" />
                Adicionar Item
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="md:col-span-5 space-y-2">
                <Label className={index === 0 ? "" : "md:invisible"}>
                  Descricao *
                </Label>
                <Input
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(index, "description", e.target.value)
                  }
                  readOnly={readOnly}
                  placeholder="Descricao do item"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className={index === 0 ? "" : "md:invisible"}>
                  Qtd *
                </Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, "quantity", e.target.value)
                  }
                  readOnly={readOnly}
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label className={index === 0 ? "" : "md:invisible"}>
                  Preco Unit. *
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleItemChange(index, "unitPrice", e.target.value)
                  }
                  readOnly={readOnly}
                />
              </div>

              <div className="md:col-span-1 space-y-2">
                <Label className={index === 0 ? "" : "md:invisible"}>
                  Total
                </Label>
                <div className="h-8 flex items-center text-sm font-medium">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </div>
              </div>

              {!readOnly && (
                <div className="md:col-span-1 flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={formData.items.length <= 1}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-col items-end gap-2 pt-4 border-t">
            <div className="flex items-center gap-4 text-base font-bold">
              <span>Total:</span>
              <span>{formatCurrency(calculatedTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warranty Section */}
      <Card>
        <CardHeader>
          <CardTitle>Garantia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!readOnly && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="warrantyEnabled"
                checked={formData.warrantyEnabled}
                onChange={(e) => handleChange("warrantyEnabled", e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="warrantyEnabled">Oferecer garantia para este servico</Label>
            </div>
          )}
          {formData.warrantyEnabled && (
            <div className="space-y-2">
              <Label htmlFor="warrantyTerms">Termos da Garantia</Label>
              <Textarea
                id="warrantyTerms"
                value={formData.warrantyTerms}
                onChange={(e) => handleChange("warrantyTerms", e.target.value)}
                readOnly={readOnly}
                placeholder="Ex: 90 dias contra defeitos de fabricacao"
                rows={2}
              />
            </div>
          )}
          {existingWarrantyEnabled && warrantyEndDate && (
            <p className="text-sm text-muted-foreground">
              Garantia valida ate: {new Date(warrantyEndDate).toLocaleDateString("pt-BR")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Observations */}
      <Card>
        <CardHeader>
          <CardTitle>Observacoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="internalNotes">Observacoes Internas</Label>
            <Textarea
              id="internalNotes"
              value={formData.internalNotes}
              onChange={(e) => handleChange("internalNotes", e.target.value)}
              readOnly={readOnly}
              placeholder="Observacoes internas (nao visiveis ao cliente)"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerNotes">Observacoes para o Cliente</Label>
            <Textarea
              id="customerNotes"
              value={formData.customerNotes}
              onChange={(e) => handleChange("customerNotes", e.target.value)}
              readOnly={readOnly}
              placeholder="Observacoes visiveis ao cliente"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observacoes Gerais</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              readOnly={readOnly}
              placeholder="Observacoes adicionais"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}