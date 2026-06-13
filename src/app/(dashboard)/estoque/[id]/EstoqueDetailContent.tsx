"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EstoqueForm, type EstoqueFormData } from "@/components/modules/estoque-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  quantity: number;
  minStock: number;
  costPrice: number | null;
  salePrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EstoqueDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/estoque/${id}`);
        if (!res.ok) {
          setError("Produto nao encontrado");
          return;
        }
        const data = await res.json();
        setProduct(data);
      } catch {
        setError("Erro ao carregar produto");
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  async function handleUpdate(data: EstoqueFormData) {
    setError(null);
    const res = await fetch(`/api/estoque/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar produto");
      return;
    }

    const updated = await res.json();
    setProduct({ ...product!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const res = await fetch(`/api/estoque/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir produto");
      return;
    }
    router.push("/estoque");
    router.refresh();
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {error || "Produto nao encontrado"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/estoque")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  const isLow = product.quantity <= product.minStock;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancelar" : "Editar"}
          </Button>
          {!editing && (
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <EstoqueForm
              initialData={{
                name: product.name,
                description: product.description || "",
                sku: product.sku || "",
                category: product.category || "",
                quantity: product.quantity,
                minStock: product.minStock,
                costPrice: product.costPrice ?? 0,
                salePrice: product.salePrice,
              }}
              onSubmit={handleUpdate}
              submitLabel="Salvar Alteracoes"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">SKU:</span>{" "}
                <span>{product.sku || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Categoria:</span>{" "}
                <span>{product.category || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Quantidade:</span>{" "}
                <span>{product.quantity}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estoque Minimo:</span>{" "}
                <span>{product.minStock}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Preco de Custo:</span>{" "}
                <span>{product.costPrice ? formatCurrency(product.costPrice) : "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Preco de Venda:</span>{" "}
                <span>{formatCurrency(product.salePrice)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                {isLow ? (
                  <Badge variant="destructive">Estoque Baixo</Badge>
                ) : (
                  <Badge variant="default">OK</Badge>
                )}
              </div>
              {product.description && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Descricao:</span>{" "}
                  <span>{product.description}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
