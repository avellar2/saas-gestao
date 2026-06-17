"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CatalogoForm, type CatalogoFormData } from "@/components/modules/catalogo-form";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/utils";
import { Package, Pencil, Trash2, ArrowLeft, Share2, FileText } from "lucide-react";

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
          actionLabel="Voltar para Catálogo"
          actionHref="/catalogo"
        />
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-[1400px] mx-auto px-6 py-8 space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-base font-medium"
        >
          {error}
        </motion.div>
      )}

      {editing ? (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[2.25rem] font-extrabold text-foreground">Editar Item</h1>
              <p className="text-base font-medium text-muted-foreground mt-1">{item.name}</p>
            </div>
            <Button variant="outline" onClick={() => setEditing(false)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
              Cancelar
            </Button>
          </div>
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-teal-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 bg-teal-50/40 dark:bg-teal-950/20 border-b border-border/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Dados do Item</h2>
                <p className="text-base text-muted-foreground font-medium">Altere as informações abaixo</p>
              </div>
            </div>
            <div className="p-6">
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
                submitLabel="Salvar Alterações"
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400">
                  <Package className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-[2.25rem] font-extrabold text-foreground">{item.name}</h1>
                  <p className="text-base text-muted-foreground mt-1">{item.category || "Sem categoria"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage())}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
                    <Share2 className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </a>
                <Button variant="outline" onClick={() => setEditing(true)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="rounded-lg h-9 transition-all duration-150 active:scale-[0.97]">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
                <Button variant="ghost" onClick={() => router.push("/catalogo")} className="rounded-lg h-9 hover:bg-muted/50 transition-all duration-150">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-teal-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 bg-teal-50/40 dark:bg-teal-950/20 border-b border-border/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400">
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
                    <p className="text-base text-foreground font-semibold">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${item.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {item.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {item.imageUrl && (
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Imagem</p>
                      <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="text-base text-primary underline">{item.imageUrl}</a>
                    </div>
                  )}
                  {item.description && (
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</p>
                      <p className="text-base text-foreground whitespace-pre-wrap">{item.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
