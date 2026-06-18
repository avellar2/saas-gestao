"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { m } from "framer-motion";
import {
  CardapioForm,
  type MenuItemFormData,
} from "@/components/modules/cardapio-form";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/utils";
import { ChefHat, Pencil, Trash2, ArrowLeft, FileText, Eye, EyeOff } from "lucide-react";

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

const easeOut = [0.23, 1, 0.32, 1] as [number, number, number, number];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
};

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
          setError("Item não encontrado");
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
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          title="Item não encontrado"
          description={error || "O item solicitado não existe ou foi removido."}
          actionLabel="Voltar para Cardápio"
          actionHref="/cardapio"
        />
      </div>
    );
  }

  return (
    <m.div
      className="max-w-[1400px] mx-auto px-6 py-8 space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {error && (
        <m.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-base font-medium"
        >
          {error}
        </m.div>
      )}

      {editing ? (
        <m.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[2.25rem] font-extrabold text-foreground">Editar Item</h1>
              <p className="text-base font-medium text-muted-foreground mt-1">{item.name}</p>
            </div>
            <Button variant="outline" onClick={() => setEditing(false)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
              Cancelar
            </Button>
          </div>
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 bg-orange-50/40 dark:bg-orange-950/20 border-b border-border/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Dados do Item</h2>
                <p className="text-base text-muted-foreground font-medium">Altere as informações abaixo</p>
              </div>
            </div>
            <div className="p-6">
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
                submitLabel="Salvar Alterações"
              />
            </div>
          </div>
        </m.div>
      ) : (
        <>
          <m.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
                  <ChefHat className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-[2.25rem] font-extrabold text-foreground">{item.name}</h1>
                  <p className="text-base text-muted-foreground mt-1">{item.category || "Sem categoria"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setEditing(true)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="rounded-lg h-9 transition-all duration-150 active:scale-[0.97]">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
                <Button variant="ghost" onClick={() => router.push("/cardapio")} className="rounded-lg h-9 hover:bg-muted/50 transition-all duration-150">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>
          </m.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <m.div variants={itemVariants} className="md:col-span-2">
              <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="px-6 py-5 bg-orange-50/40 dark:bg-orange-950/20 border-b border-border/40 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Informações do Item</h2>
                    <p className="text-base text-muted-foreground font-medium">Detalhes completos</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Categoria</p>
                      <p className="text-base text-foreground">{item.category || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Preço</p>
                      <p className="text-base text-foreground font-semibold">{formatCurrency(Number(item.price))}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Ordem</p>
                      <p className="text-base text-foreground">{item.sortOrder}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${item.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {item.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {item.description && (
                      <div className="md:col-span-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</p>
                        <p className="text-base text-foreground">{item.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </m.div>

            <m.div variants={itemVariants}>
              <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="px-6 py-5 bg-orange-50/40 dark:bg-orange-950/20 border-b border-border/40 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
                    {item.active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Visualização</h2>
                    <p className="text-base text-muted-foreground font-medium">Prévia no cardápio</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex flex-col items-center text-center">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full aspect-square object-cover rounded-xl mb-4"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-xl mb-4 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                        Sem imagem
                      </div>
                    )}
                    <h3 className="font-semibold text-base">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <p className="text-lg font-bold mt-2">{formatCurrency(Number(item.price))}</p>
                    {item.category && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200 mt-2">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/30 text-center text-xs text-muted-foreground">
                    {item.active
                      ? "Este item está visível no cardápio"
                      : "Este item está oculto do cardápio"}
                  </div>
                </div>
              </div>
            </m.div>
          </div>
        </>
      )}
    </m.div>
  );
}
