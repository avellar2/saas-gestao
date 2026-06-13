"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MenuItemFormData {
  name: string;
  description: string;
  price: number | ""; // "" para placeholder vazio
  category: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
}

interface CardapioFormProps {
  initialData?: Partial<MenuItemFormData>;
  onSubmit: (data: MenuItemFormData) => Promise<void>;
  submitLabel?: string;
}

export function CardapioForm({
  initialData,
  onSubmit,
  submitLabel = "Salvar",
}: CardapioFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price ?? "",
    category: initialData?.category || "",
    imageUrl: initialData?.imageUrl || "",
    active: initialData?.active ?? true,
    sortOrder: initialData?.sortOrder ?? 0,
  });

  function handleChange(
    field: keyof MenuItemFormData,
    value: string | number | boolean
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
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="Ex: Cafe Cremoso"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Preco *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) =>
              handleChange(
                "price",
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            required
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value)}
            placeholder="Ex: Bebidas, Pratos, Sobremesas"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">URL da Imagem</Label>
          <Input
            id="imageUrl"
            value={formData.imageUrl}
            onChange={(e) => handleChange("imageUrl", e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">Ordem de Exibicao</Label>
          <Input
            id="sortOrder"
            type="number"
            min="0"
            value={formData.sortOrder}
            onChange={(e) =>
              handleChange("sortOrder", Number(e.target.value))
            }
            placeholder="0"
          />
        </div>

        <div className="flex items-end pb-2 space-x-2">
          <input
            id="active"
            type="checkbox"
            checked={formData.active}
            onChange={(e) => handleChange("active", e.target.checked)}
            className="h-4 w-4 rounded border border-input accent-primary"
          />
          <Label htmlFor="active" className="cursor-pointer">
            Item ativo no cardapio
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descricao</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Descricao do item..."
          rows={3}
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
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
