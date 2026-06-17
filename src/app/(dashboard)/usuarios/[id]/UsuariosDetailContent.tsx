"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UsuarioForm, type UsuarioFormData } from "@/components/modules/usuario-form";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { User, Pencil, Trash2, ArrowLeft, Shield, Circle } from "lucide-react";

interface UsuarioDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: "Administrador",
  STAFF: "Colaborador",
};

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

export default function UsuariosDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [usuario, setUsuario] = useState<UsuarioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsuario() {
      try {
        const res = await fetch(`/api/usuarios/${id}`);
        if (!res.ok) {
          setError("Usuário não encontrado");
          return;
        }
        const data = await res.json();
        setUsuario(data);
      } catch {
        setError("Erro ao carregar usuário");
      } finally {
        setLoading(false);
      }
    }
    loadUsuario();
  }, [id]);

  async function handleUpdate(data: UsuarioFormData) {
    setError(null);
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar usuário");
      return;
    }

    const updated = await res.json();
    setUsuario({ ...usuario!, ...updated });
    setEditing(false);
  }

  async function handleToggleActive() {
    if (!usuario) return;

    const newActive = !usuario.active;
    const confirmMsg = newActive
      ? "Tem certeza que deseja ativar este usuário?"
      : "Tem certeza que deseja desativar este usuário?";

    if (!confirm(confirmMsg)) return;

    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao alterar status do usuário");
      return;
    }

    const updated = await res.json();
    setUsuario({ ...usuario!, ...updated });
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir usuário");
      return;
    }
    router.push("/usuarios");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          title="Usuário não encontrado"
          description={error || "O usuário solicitado não existe ou foi removido."}
          actionLabel="Voltar para Usuários"
          actionHref="/usuarios"
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
              <h1 className="text-[2.25rem] font-extrabold text-foreground">Editar Usuário</h1>
              <p className="text-base font-medium text-muted-foreground mt-1">{usuario.name}</p>
            </div>
            <Button variant="outline" onClick={() => setEditing(false)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
              Cancelar
            </Button>
          </div>
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-slate-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 bg-slate-50/40 dark:bg-slate-950/20 border-b border-border/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center text-slate-700 dark:text-slate-400">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Dados do Usuário</h2>
                <p className="text-base text-muted-foreground font-medium">Altere as informações abaixo</p>
              </div>
            </div>
            <div className="p-6">
              <UsuarioForm
                initialData={{
                  name: usuario.name,
                  email: usuario.email,
                  role: usuario.role as "COMPANY_ADMIN" | "STAFF",
                  active: usuario.active,
                  password: "",
                }}
                onSubmit={handleUpdate}
                submitLabel="Salvar Alterações"
                isEdit
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center text-slate-700 dark:text-slate-400">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-[2.25rem] font-extrabold text-foreground">{usuario.name}</h1>
                  <p className="text-base text-muted-foreground mt-1">{usuario.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setEditing(true)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant={usuario.active ? "secondary" : "default"} onClick={handleToggleActive} className="rounded-lg h-9 transition-all duration-150 active:scale-[0.97]">
                  <Circle className="h-4 w-4 mr-2" />
                  {usuario.active ? "Desativar" : "Ativar"}
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="rounded-lg h-9 transition-all duration-150 active:scale-[0.97]">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
                <Button variant="ghost" onClick={() => router.push("/usuarios")} className="rounded-lg h-9 hover:bg-muted/50 transition-all duration-150">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-slate-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 bg-slate-50/40 dark:bg-slate-950/20 border-b border-border/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center text-slate-700 dark:text-slate-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Informações do Usuário</h2>
                  <p className="text-base text-muted-foreground font-medium">Dados cadastrais</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Nome</p>
                    <p className="text-base text-foreground">{usuario.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">E-mail</p>
                    <p className="text-base text-foreground">{usuario.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Função</p>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">
                      {ROLE_LABELS[usuario.role] || usuario.role}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${usuario.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {usuario.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Criado em</p>
                    <p className="text-base text-foreground">{new Date(usuario.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Atualizado em</p>
                    <p className="text-base text-foreground">{new Date(usuario.updatedAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
