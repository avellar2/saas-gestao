"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CardapioForm,
  type MenuItemFormData,
} from "@/components/modules/cardapio-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";

interface MenuItemDetail {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function CardapioDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<MenuItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadItem() {
      try {
        const res = await fetch(`/api/cardapio/${id}`);
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

  async function handleUpdate(data: MenuItemFormData) {
    setError(null);

    const payload = {
      ...data,
      price: data.price === "" ? 0 : data.price,
    };

    const res = await fetch(`/api/cardapio/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

    const res = await fetch(`/api/cardapio/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir item");
      return;
    }
    router.push("/cardapio");
    router.refresh();
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
          onClick={() => router.push("/cardapio")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{item.name}</h1>
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
            <CardTitle>Editar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <CardapioForm
              initialData={{
                name: item.name,
                description: item.description || "",
                price: Number(item.price),
                category: item.category || "",
                imageUrl: item.imageUrl || "",
                active: item.active,
                sortOrder: item.sortOrder,
              }}
              onSubmit={handleUpdate}
              submitLabel="Salvar Alteracoes"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Info card */}
          <div className="md:col-span-2">
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
                    <span className="font-semibold">
                      {formatCurrency(Number(item.price))}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ordem:</span>{" "}
                    <span>{item.sortOrder}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {item.description && (
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">
                        Descricao:
                      </span>{" "}
                      <span>{item.description}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visualizacao do cardapio */}
          <div>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  Visualizacao do Cardapio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col items-center text-center p-4 border-b">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full aspect-square object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-lg mb-3 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                      Sem imagem
                    </div>
                  )}
                  <h3 className="font-semibold text-base">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-lg font-bold mt-2">
                    {formatCurrency(Number(item.price))}
                  </p>
                  {item.category && (
                    <Badge variant="outline" className="mt-2">
                      {item.category}
                    </Badge>
                  )}
                </div>
                <div className="p-3 text-center text-xs text-muted-foreground">
                  {item.active
                    ? "Este item esta visivel no cardapio"
                    : "Este item esta oculto do cardapio"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
