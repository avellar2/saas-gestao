"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  paidAmount?: number;
  total?: number;
}

function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "PARTIAL":
      return "Parcial";
    case "PAID":
      return "Pago";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

function getPaymentStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PAID":
      return "default";
    case "PARTIAL":
      return "outline";
    case "PENDING":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function ServiceOrderForm({
  customers,
  quotes,
  initialData,
  onSubmit,
  submitLabel = "Salvar",
  readOnly = false,
  paymentStatus,
  paidAmount,
  total: existingTotal,
}: ServiceOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ServiceOrderFormData>({
    customerId: initialData?.customerId || "",
    quoteId: initialData?.quoteId || "",
    problemDescription: initialData?.problemDescription || "",
    serviceDescription: initialData?.serviceDescription || "",
    notes: initialData?.notes || "",
    items: initialData?.items || [
      { description: "", quantity: 1, unitPrice: 0 },
    ],
  });

  function handleChange(
    field: keyof ServiceOrderFormData,
    value: string | number | ServiceOrderItemData[]
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="problemDescription">Descricao do Problema</Label>
            <textarea
              id="problemDescription"
              value={formData.problemDescription}
              onChange={(e) =>
                handleChange("problemDescription", e.target.value)
              }
              readOnly={readOnly}
              placeholder="Descreva o problema relatado pelo cliente"
              rows={3}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceDescription">Descricao do Servico</Label>
            <textarea
              id="serviceDescription"
              value={formData.serviceDescription}
              onChange={(e) =>
                handleChange("serviceDescription", e.target.value)
              }
              readOnly={readOnly}
              placeholder="Descreva o servico a ser realizado"
              rows={3}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {paymentStatus && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Pagamento:</span>
              <Badge variant={getPaymentStatusVariant(paymentStatus)}>
                {getPaymentStatusLabel(paymentStatus)}
              </Badge>
              {paidAmount !== undefined && existingTotal !== undefined && (
                <span>
                  {formatCurrency(paidAmount)} / {formatCurrency(existingTotal)}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>Observacoes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            readOnly={readOnly}
            placeholder="Observacoes adicionais"
            rows={3}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
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