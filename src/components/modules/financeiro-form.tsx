"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FinanceiroFormData {
  type: "RECEIVABLE" | "PAYABLE";
  description: string;
  category: string;
  amount: string;
  dueDate: string;
  customerId: string;
  notes: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface FinanceiroFormProps {
  initialData?: Partial<FinanceiroFormData>;
  onSubmit: (data: FinanceiroFormData) => Promise<void>;
  submitLabel?: string;
  customers?: CustomerOption[];
}

export function FinanceiroForm({
  initialData,
  onSubmit,
  submitLabel = "Salvar",
  customers = [],
}: FinanceiroFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FinanceiroFormData>({
    type: initialData?.type || "RECEIVABLE",
    description: initialData?.description || "",
    category: initialData?.category || "",
    amount: initialData?.amount || "",
    dueDate: initialData?.dueDate || "",
    customerId: initialData?.customerId || "",
    notes: initialData?.notes || "",
  });

  function handleChange(
    field: keyof FinanceiroFormData,
    value: string
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => handleChange("type", e.target.value)}
            required
            className="flex h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="RECEIVABLE">A Receber</option>
            <option value="PAYABLE">A Pagar</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value)}
            placeholder="Ex: Servicos, Produtos, Impostos"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descricao *</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            required
            placeholder="Descricao da transacao"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            required
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Vencimento</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange("dueDate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerId">Cliente</Label>
          <select
            id="customerId"
            value={formData.customerId}
            onChange={(e) => handleChange("customerId", e.target.value)}
            className="flex h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Nenhum</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observacoes</Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Observacoes sobre a transacao"
          rows={3}
          className="flex min-h-[120px] w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-base shadow-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
