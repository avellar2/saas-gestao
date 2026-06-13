"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CatalogoForm, type CatalogoFormData } from "@/components/modules/catalogo-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";

interface CatalogItemDetail {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CatalogoDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<CatalogItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadItem() {
      try {
        const res = await fetch(`/api/catalogo/${id}`);
        if (!res.ok) {
          setError("Item nao encontrado");
          return;
        }
        const data = await res.json();
        setItem(data);
      } catch {
        setError("Erro ao carregar item");
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  async function handleUpdate(data: CatalogoFormData) {
    setError(null);
    const res = await fetch(`/api/catalogo/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar item");
      return;
    }

    const updated = await res.json();
    setItem({ ...item!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    const res = await fetch(`/api/catalogo/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir item");
      return;
    }
    router.push("/catalogo");
    router.refresh();
  }

  function buildWhatsAppMessage(): string {
    const lines = [`*${item!.name}*`, `${formatCurrency(item!.price)}`];
    if (item!.description) {
      lines.push("", item!.description);
    }
    return lines.join("\n");
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {error || "Item nao encontrado"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/catalogo")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        <div className="flex gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage())}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">Compartilhar WhatsApp</Button>
          </a>
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
            <CardTitle>Editar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <CatalogoForm
              initialData={{
                name: item.name,
                description: item.description || "",
                price: item.price,
                category: item.category || "",
                imageUrl: item.imageUrl || "",
                active: item.active,
              }}
              onSubmit={handleUpdate}
              submitLabel="Salvar Alteracoes"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Categoria:</span>{" "}
                <span>{item.category || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Preco:</span>{" "}
                <span>{formatCurrency(item.price)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                {item.active ? (
                  <Badge variant="default">Ativo</Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
              {item.imageUrl && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Imagem:</span>{" "}
                  <a
                    href={item.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {item.imageUrl}
                  </a>
                </div>
              )}
              {item.description && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Descricao:</span>{" "}
                  <span className="whitespace-pre-wrap">{item.description}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
