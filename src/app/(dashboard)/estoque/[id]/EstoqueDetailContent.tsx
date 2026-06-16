"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EstoqueForm, type EstoqueFormData } from "@/components/modules/estoque-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { getStockStatus, STOCK_STATUS_CONFIG, MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_VARIANTS, MOVEMENT_REASON_LABELS, getMovementOrigin, ORIGIN_LABELS } from "@/lib/estoque-helpers";
import { Plus, Minus, SlidersHorizontal, History } from "lucide-react";

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

interface Movement {
  id: string;
  type: string;
  reason: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  description: string | null;
  serviceOrderId: string | null;
  createdById: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
}

export default function EstoqueDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [dialog, setDialog] = useState<"entrada" | "saida" | "ajuste" | null>(null);
  const [dialogQty, setDialogQty] = useState("");
  const [dialogDesc, setDialogDesc] = useState("");
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        const [prodRes, movRes] = await Promise.all([
          fetch(`/api/estoque/${id}`),
          fetch(`/api/estoque/movimentacoes?productId=${id}&limit=20`),
        ]);

        if (!prodRes.ok) {
          setError("Produto não encontrado");
          return;
        }
        const prodData = await prodRes.json();
        setProduct(prodData);

        if (movRes.ok) {
          const movData = await movRes.json();
          setMovements(movData.movements || []);
        }
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
    // Remove quantity do payload para evitar alteração não auditada
    const { quantity, ...safeData } = data;
    const res = await fetch(`/api/estoque/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeData),
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

  async function handleDialogSubmit() {
    if (!dialog) return;
    setDialogLoading(true);
    setDialogError(null);

    const qty = parseFloat(dialogQty);
    if (isNaN(qty) || qty <= 0) {
      setDialogError("Quantidade deve ser maior que zero");
      setDialogLoading(false);
      return;
    }

    try {
      let endpoint = "";
      let body: Record<string, unknown> = { quantity: qty };

      if (dialog === "entrada") {
        endpoint = `/api/estoque/${id}/entrada`;
      } else if (dialog === "saida") {
        endpoint = `/api/estoque/${id}/saida`;
      } else if (dialog === "ajuste") {
        endpoint = `/api/estoque/${id}/ajuste`;
        body = { newQuantity: qty };
      }

      if (dialogDesc.trim()) body.description = dialogDesc.trim();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json();
        setDialogError(errBody.error || "Erro ao processar operação");
        setDialogLoading(false);
        return;
      }

      const updated = await res.json();
      setProduct({ ...product!, quantity: updated.quantity });
      setDialog(null);
      setDialogQty("");
      setDialogDesc("");

      // Recarrega movimentações
      const movRes = await fetch(`/api/estoque/movimentacoes?productId=${id}&limit=20`);
      if (movRes.ok) {
        const movData = await movRes.json();
        setMovements(movData.movements || []);
      }
    } catch {
      setDialogError("Erro de conexão");
    } finally {
      setDialogLoading(false);
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {error || "Produto não encontrado"}
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

  const qty = Number(product.quantity);
  const min = Number(product.minStock);
  const status = getStockStatus(qty, min);
  const statusCfg = STOCK_STATUS_CONFIG[status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setDialog("entrada"); setDialogQty(""); setDialogDesc(""); setDialogError(null); }}>
                <Plus className="h-4 w-4 mr-1" />
                Entrada
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setDialog("saida"); setDialogQty(""); setDialogDesc(""); setDialogError(null); }}>
                <Minus className="h-4 w-4 mr-1" />
                Saída
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setDialog("ajuste"); setDialogQty(String(qty)); setDialogDesc(""); setDialogError(null); }}>
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Ajustar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                {editing ? "Cancelar" : "Editar"}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Excluir
              </Button>
            </>
          )}
          {editing && (
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      {/* Edição */}
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
              submitLabel="Salvar Alterações"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Informações do Produto */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
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
                  <span className="font-bold text-lg">{qty}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Estoque Mínimo:</span>{" "}
                  <span>{min}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Preço de Custo:</span>{" "}
                  <span>{product.costPrice ? formatCurrency(product.costPrice) : "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Preço de Venda:</span>{" "}
                  <span>{formatCurrency(product.salePrice)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                {product.description && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Descrição:</span>{" "}
                    <span>{product.description}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Movimentações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma movimentação registrada para este produto.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left p-2 font-medium">Data</th>
                        <th className="text-left p-2 font-medium">Tipo</th>
                        <th className="text-left p-2 font-medium">Motivo</th>
                        <th className="text-right p-2 font-medium">Qtd</th>
                        <th className="text-right p-2 font-medium">Anterior</th>
                        <th className="text-right p-2 font-medium">Novo</th>
                        <th className="text-left p-2 font-medium">Origem</th>
                        <th className="text-left p-2 font-medium">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => {
                        const origin = getMovementOrigin(m);
                        return (
                          <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-2 text-muted-foreground whitespace-nowrap text-xs">
                              {new Date(m.createdAt).toLocaleString("pt-BR")}
                            </td>
                            <td className="p-2">
                              <Badge variant={MOVEMENT_TYPE_VARIANTS[m.type] || "outline"} className="text-xs">
                                {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                              </Badge>
                            </td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {MOVEMENT_REASON_LABELS[m.reason] || m.reason}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : "±"}
                              {m.quantity}
                            </td>
                            <td className="p-2 text-right text-muted-foreground">{m.previousQuantity}</td>
                            <td className="p-2 text-right text-muted-foreground">{m.newQuantity}</td>
                            <td className="p-2">
                              <Badge variant={origin === "os" ? "secondary" : "outline"} className="text-xs">
                                {ORIGIN_LABELS[origin]}
                              </Badge>
                            </td>
                            <td className="p-2 text-muted-foreground text-xs max-w-[150px] truncate">
                              {m.description || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog de Entrada/Saída/Ajuste */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-lg font-bold">
              {dialog === "entrada" && `Entrada de Estoque — ${product.name}`}
              {dialog === "saida" && `Saída de Estoque — ${product.name}`}
              {dialog === "ajuste" && `Ajuste de Estoque — ${product.name}`}
            </h3>

            <p className="text-sm text-muted-foreground">
              Estoque atual: <strong>{qty}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">
                  {dialog === "ajuste" ? "Nova quantidade" : "Quantidade"}
                </label>
                <input
                  type="number"
                  min={dialog === "ajuste" ? 0 : 1}
                  step="any"
                  value={dialogQty}
                  onChange={(e) => setDialogQty(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring mt-1"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Descrição {dialog === "ajuste" ? "(obrigatória)" : "(opcional)"}
                </label>
                <input
                  type="text"
                  value={dialogDesc}
                  onChange={(e) => setDialogDesc(e.target.value)}
                  placeholder={dialog === "ajuste" ? "Motivo do ajuste..." : "Descrição da movimentação..."}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring mt-1"
                />
              </div>
            </div>

            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setDialog(null); setDialogError(null); }}
                disabled={dialogLoading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleDialogSubmit}
                disabled={dialogLoading || !dialogQty}
              >
                {dialogLoading ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
