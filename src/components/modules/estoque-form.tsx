"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EstoqueFormData {
  name: string;
  description: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  registerExpense?: boolean;
}

interface EstoqueFormProps {
  initialData?: Partial<EstoqueFormData>;
  onSubmit: (data: EstoqueFormData) => Promise<void>;
  submitLabel?: string;
}

export function EstoqueForm({
  initialData,
  onSubmit,
  submitLabel = "Salvar",
}: EstoqueFormProps) {
  const [loading, setLoading] = useState(false);
  const [registerExpense, setRegisterExpense] = useState(false);
  const [formData, setFormData] = useState<EstoqueFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    sku: initialData?.sku || "",
    category: initialData?.category || "",
    quantity: initialData?.quantity ?? 0,
    minStock: initialData?.minStock ?? 0,
    costPrice: initialData?.costPrice ?? 0,
    salePrice: initialData?.salePrice ?? 0,
  });

  function handleChange(field: keyof EstoqueFormData, value: string | number) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ ...formData, registerExpense });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="Nome do produto"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => handleChange("sku", e.target.value)}
            placeholder="Código do produto"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value)}
            placeholder="Ex: Eletrônicos, Limpeza"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantidade</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            min="0"
            value={formData.quantity}
            onChange={(e) => handleChange("quantity", parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minStock">Estoque Mínimo</Label>
          <Input
            id="minStock"
            type="number"
            step="0.01"
            min="0"
            value={formData.minStock}
            onChange={(e) => handleChange("minStock", parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="costPrice">Preço de Custo</Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            min="0"
            value={formData.costPrice}
            onChange={(e) => handleChange("costPrice", parseFloat(e.target.value) || 0)}
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salePrice">Preço de Venda</Label>
          <Input
            id="salePrice"
            type="number"
            step="0.01"
            min="0"
            value={formData.salePrice}
            onChange={(e) => handleChange("salePrice", parseFloat(e.target.value) || 0)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Descrição do produto"
          rows={3}
          className="flex min-h-[120px] w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-base shadow-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
        />
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-amber-50/30">
        <input
          type="checkbox"
          id="registerExpense"
          checked={registerExpense}
          onChange={(e) => setRegisterExpense(e.target.checked)}
          className="h-4 w-4 rounded border-border text-amber-600 focus:ring-amber-500"
        />
        <Label htmlFor="registerExpense" className="text-sm cursor-pointer">
          Registrar despesa no financeiro (R$ {Number(formData.quantity * formData.costPrice).toFixed(2)})
        </Label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
