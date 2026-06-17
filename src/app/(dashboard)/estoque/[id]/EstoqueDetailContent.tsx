"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EstoqueForm, type EstoqueFormData } from "@/components/modules/estoque-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ActionBar } from "@/components/layout/action-bar";
import {
  getStockStatus, STOCK_STATUS_CONFIG, MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_VARIANTS,
  MOVEMENT_REASON_LABELS, getMovementOrigin, ORIGIN_LABELS
} from "@/lib/estoque-helpers";
import {
  Plus, Minus, SlidersHorizontal, History, Package, ChevronLeft
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const easeOut = [0.23, 1, 0.32, 1] as [number, number, number, number];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, duration: 0.3, ease: easeOut },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOut } },
};

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
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          title="Produto não encontrado"
          description={error || "O produto solicitado não existe ou foi removido."}
          actionLabel="Voltar"
          actionHref="/estoque"
        />
      </div>
    );
  }

  const qty = Number(product.quantity);
  const min = Number(product.minStock);
  const status = getStockStatus(qty, min);
  const statusCfg = STOCK_STATUS_CONFIG[status];

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3.5 rounded-lg text-sm font-semibold border-border/80 hover:bg-muted/50 transition-all duration-150"
          onClick={() => router.push("/estoque")}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>

        <ActionBar
          primaryActions={[
            { key: "entrada", label: "Entrada", icon: Plus, variant: "default", onClick: () => { setDialog("entrada"); setDialogQty(""); setDialogDesc(""); setDialogError(null); } },
            { key: "saida", label: "Saída", icon: Minus, variant: "default", onClick: () => { setDialog("saida"); setDialogQty(""); setDialogDesc(""); setDialogError(null); } },
            { key: "ajuste", label: "Ajustar", icon: SlidersHorizontal, variant: "outline", onClick: () => { setDialog("ajuste"); setDialogQty(String(qty)); setDialogDesc(""); setDialogError(null); } },
          ]}
          secondaryActions={[
            { key: "edit", label: editing ? "Cancelar" : "Editar", icon: editing ? undefined : SlidersHorizontal, variant: "outline", onClick: () => setEditing(!editing) },
            { key: "div", label: "", divider: true },
            { key: "delete", label: "Excluir", icon: undefined, variant: "destructive", onClick: handleDelete },
          ]}
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Error */}
        {error && (
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm"
          >
            {error}
          </motion.div>
        )}

        {editing ? (
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 bg-amber-50/40 border-b border-border/40">
                <h2 className="text-lg font-bold text-foreground">Editar Produto</h2>
                <p className="text-base text-muted-foreground">Atualize os dados do produto</p>
              </div>
              <div className="p-6">
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
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Hero Card */}
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="px-6 py-5 bg-amber-50/40 border-b border-border/40">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-amber-100 text-amber-600">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h1 className="text-xl font-extrabold text-foreground">{product.name}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          SKU: {product.sku || "—"} · Categoria: {product.category || "—"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${statusCfg.classes}`}
                    >
                      {statusCfg.label}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Quantidade", value: String(qty), highlight: true },
                    { label: "Estoque Mínimo", value: String(min) },
                    { label: "Preço de Custo", value: product.costPrice ? formatCurrency(product.costPrice) : "—" },
                    { label: "Preço de Venda", value: formatCurrency(product.salePrice) },
                    { label: "Status", value: product.active ? "Ativo" : "Inativo" },
                    { label: "Atualizado em", value: new Date(product.updatedAt).toLocaleString("pt-BR") },
                  ].map((info, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">{info.label}</p>
                      <p className={`text-sm font-medium text-foreground leading-relaxed ${info.highlight ? "text-2xl font-extrabold text-amber-600" : ""}`}>{info.value}</p>
                    </div>
                  ))}
                  {product.description && (
                    <div className="sm:col-span-2 lg:col-span-4 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</p>
                      <p className="text-sm font-medium text-foreground leading-relaxed">{product.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Movimentações */}
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="px-6 py-5 bg-amber-50/40 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <History className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Histórico de Movimentações</h2>
                      <p className="text-base text-muted-foreground">Entradas, saídas e ajustes</p>
                    </div>
                  </div>
                </div>
                {movements.length === 0 ? (
                  <div className="px-6 py-10">
                    <EmptyState
                      variant="compact"
                      title="Nenhuma movimentação"
                      description="Não há movimentações registradas para este produto."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/40">
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Data</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Tipo</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Motivo</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Qtd</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Anterior</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Novo</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Origem</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((m) => {
                          const origin = getMovementOrigin(m);
                          return (
                            <TableRow key={m.id} className="group border-b border-border/30 transition-colors duration-150 hover:bg-amber-50/30 last:border-b-0">
                              <TableCell className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(m.createdAt).toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-sm">
                                <Badge variant={MOVEMENT_TYPE_VARIANTS[m.type] || "outline"} className="rounded-full text-xs font-medium">
                                  {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                                {MOVEMENT_REASON_LABELS[m.reason] || m.reason}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-sm font-medium text-right tabular-nums">
                                {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : "±"}
                                {m.quantity}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-sm text-muted-foreground text-right tabular-nums">{m.previousQuantity}</TableCell>
                              <TableCell className="py-3 px-4 text-sm text-muted-foreground text-right tabular-nums">{m.newQuantity}</TableCell>
                              <TableCell className="py-3 px-4 text-sm">
                                <Badge variant={origin === "os" ? "secondary" : "outline"} className="rounded-full text-xs font-medium">
                                  {ORIGIN_LABELS[origin]}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 px-4 text-sm text-muted-foreground max-w-[150px] truncate">
                                {m.description || "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Dialog de Entrada/Saída/Ajuste */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-2xl shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
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
                <label className="text-sm font-semibold mb-1.5 block">
                  {dialog === "ajuste" ? "Nova quantidade" : "Quantidade"}
                </label>
                <input
                  type="number"
                  min={dialog === "ajuste" ? 0 : 1}
                  step="any"
                  value={dialogQty}
                  onChange={(e) => setDialogQty(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  Descrição {dialog === "ajuste" ? "(obrigatória)" : "(opcional)"}
                </label>
                <input
                  type="text"
                  value={dialogDesc}
                  onChange={(e) => setDialogDesc(e.target.value)}
                  placeholder={dialog === "ajuste" ? "Motivo do ajuste..." : "Descrição da movimentação..."}
                  className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                />
              </div>
            </div>

            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-9 rounded-lg"
                onClick={() => { setDialog(null); setDialogError(null); }}
                disabled={dialogLoading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-9 rounded-lg"
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
