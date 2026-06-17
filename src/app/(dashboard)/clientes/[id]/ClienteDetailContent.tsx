"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ClientForm, type ClientFormData } from "@/components/modules/client-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { User, Phone, Mail, MapPin, FileText, Briefcase, ArrowLeft, Pencil, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";

const easeOut = [0.23, 1, 0.32, 1] as const;

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

interface QuoteHistory {
  id: string;
  number: number;
  status: string;
  total: number;
  createdAt: string;
}

interface ServiceOrderHistory {
  id: string;
  number: number;
  status: string;
  total: number;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  quotes: QuoteHistory[];
  serviceOrders: ServiceOrderHistory[];
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "APPROVED":
    case "PAID":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "SENT":
    case "READY":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200";
    case "DRAFT":
    case "PENDING":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export default function ClienteDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const res = await fetch(`/api/clientes/${id}`);
        if (!res.ok) {
          setError("Cliente nao encontrado");
          return;
        }
        const data = await res.json();
        setCustomer(data);
      } catch {
        setError("Erro ao carregar cliente");
      } finally {
        setLoading(false);
      }
    }
    loadCustomer();
  }, [id]);

  async function handleUpdate(data: ClientFormData) {
    setError(null);
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar cliente");
      return;
    }

    const updated = await res.json();
    setCustomer({ ...customer!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir cliente");
      return;
    }
    router.push("/clientes");
    router.refresh();
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Cliente nao encontrado"
        description={error || "O cliente solicitado nao existe ou foi removido."}
        actionLabel="Voltar para Clientes"
        actionHref="/clientes"
      />
    );
  }

  return (
    <motion.div
      className="max-w-[1400px] mx-auto px-6 py-8 space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Error */}
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
              <h1 className="text-[2.25rem] font-extrabold text-foreground">Editar Cliente</h1>
              <p className="text-base font-medium text-muted-foreground mt-1">{customer.name}</p>
            </div>
            <Button variant="outline" onClick={() => setEditing(false)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
              Cancelar
            </Button>
          </div>
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 bg-blue-50/40 dark:bg-blue-950/20 border-b border-border/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Dados do Cliente</h2>
                <p className="text-base text-muted-foreground font-medium">Altere as informações abaixo</p>
              </div>
            </div>
            <div className="p-6">
              <ClientForm
                initialData={{
                  name: customer.name,
                  phone: customer.phone || "",
                  whatsapp: customer.whatsapp || "",
                  email: customer.email || "",
                  document: customer.document || "",
                  address: customer.address || "",
                  notes: customer.notes || "",
                }}
                onSubmit={handleUpdate}
                submitLabel="Salvar Alteracoes"
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Hero */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-[2.25rem] font-extrabold text-foreground">{customer.name}</h1>
                  <div className="flex items-center gap-3 mt-1 text-base text-muted-foreground">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" /> {customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" /> {customer.email}
                      </span>
                    )}
                  </div>
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
                <Link href="/clientes">
                  <Button variant="ghost" className="rounded-lg h-9 hover:bg-muted/50 transition-all duration-150">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Informações do Cliente */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 bg-blue-50/40 dark:bg-blue-950/20 border-b border-border/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Informações do Cliente</h2>
                  <p className="text-base text-muted-foreground font-medium">Dados cadastrais</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Telefone</p>
                    <p className="text-base text-foreground">{customer.phone || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp</p>
                    <p className="text-base text-foreground">{customer.whatsapp || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">E-mail</p>
                    <p className="text-base text-foreground">{customer.email || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">CPF/CNPJ</p>
                    <p className="text-base text-foreground">{customer.document || "-"}</p>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Endereço</p>
                    <p className="text-base text-foreground">{customer.address || "-"}</p>
                  </div>
                  {customer.notes && (
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Observações</p>
                      <p className="text-base text-foreground">{customer.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Orçamentos */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 bg-blue-50/40 dark:bg-blue-950/20 border-b border-border/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Orçamentos</h2>
                  <p className="text-base text-muted-foreground font-medium">{customer.quotes.length} {customer.quotes.length === 1 ? "orçamento" : "orçamentos"}</p>
                </div>
              </div>
              <div className="p-6">
                {customer.quotes.length === 0 ? (
                  <p className="text-base text-muted-foreground text-center py-6">Nenhum orçamento para este cliente.</p>
                ) : (
                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 transition-colors">
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Número</TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Status</TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Total</TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Data</TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.quotes.map((quote) => (
                          <TableRow
                            key={quote.id}
                            className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-border/30 last:border-0"
                          >
                            <TableCell className="text-sm text-foreground font-medium px-4 py-3.5">#{String(quote.number).padStart(4, "0")}</TableCell>
                            <TableCell className="text-sm text-foreground px-4 py-3.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadgeClass(quote.status)}`}>
                                {quote.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-foreground px-4 py-3.5">{formatCurrency(quote.total)}</TableCell>
                            <TableCell className="text-sm text-foreground px-4 py-3.5">{formatDate(quote.createdAt)}</TableCell>
                            <TableCell className="text-sm text-foreground px-4 py-3.5 text-right">
                              <Link href={`/orcamentos/${quote.id}`}>
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150">
                                  <ChevronRight className="h-4 w-4" />
                                </span>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Ordens de Serviço */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 bg-blue-50/40 dark:bg-blue-950/20 border-b border-border/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Ordens de Serviço</h2>
                  <p className="text-base text-muted-foreground font-medium">{customer.serviceOrders.length} {customer.serviceOrders.length === 1 ? "ordem" : "ordens"}</p>
                </div>
              </div>
              <div className="p-6">
                {customer.serviceOrders.length === 0 ? (
                  <p className="text-base text-muted-foreground text-center py-6">Nenhuma ordem de serviço para este cliente.</p>
                ) : (
                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 transition-colors">
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Número</TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Status</TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Total</TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Data</TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.serviceOrders.map((order) => (
                          <TableRow
                            key={order.id}
                            className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-border/30 last:border-0"
                          >
                            <TableCell className="text-sm text-foreground font-medium px-4 py-3.5">#{String(order.number).padStart(4, "0")}</TableCell>
                            <TableCell className="text-sm text-foreground px-4 py-3.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadgeClass(order.status)}`}>
                                {order.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-foreground px-4 py-3.5">{formatCurrency(order.total)}</TableCell>
                            <TableCell className="text-sm text-foreground px-4 py-3.5">{formatDate(order.createdAt)}</TableCell>
                            <TableCell className="text-sm text-foreground px-4 py-3.5 text-right">
                              <Link href={`/ordens-servico/${order.id}`}>
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150">
                                  <ChevronRight className="h-4 w-4" />
                                </span>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
