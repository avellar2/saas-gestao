"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AppointmentForm,
  type AppointmentFormData,
} from "@/components/modules/appointment-form";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Calendar, Pencil, Trash2, ArrowLeft, Clock, User, FileText } from "lucide-react";

interface CustomerInfo {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

interface AppointmentDetail {
  id: string;
  title: string;
  description: string | null;
  dateTime: string;
  duration: number;
  status: string;
  notes: string | null;
  customerId: string | null;
  customer: CustomerInfo | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

const STATUS_CLASSES: Record<string, string> = {
  SCHEDULED: "bg-slate-50 text-slate-700 border-slate-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
};

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}


export default function AgendamentoDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  useEffect(() => {
    async function loadAppointment() {
      try {
        const [appRes, custRes] = await Promise.all([
          fetch(`/api/agendamento/${id}`),
          fetch("/api/clientes?limit=1000"),
        ]);

        if (!appRes.ok) {
          setError("Agendamento não encontrado");
          return;
        }
        const appData = await appRes.json();
        setAppointment(appData);

        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(
            (custData.customers || []).map(
              (c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
              })
            )
          );
        }
      } catch {
        setError("Erro ao carregar agendamento");
      } finally {
        setLoading(false);
      }
    }
    loadAppointment();
  }, [id]);

  function toFormData(a: AppointmentDetail): AppointmentFormData {
    const localDate = new Date(a.dateTime);
    const offset = localDate.getTimezoneOffset();
    const local = new Date(localDate.getTime() - offset * 60000);
    const dateTimeStr = local.toISOString().slice(0, 16);

    return {
      title: a.title,
      description: a.description || "",
      dateTime: dateTimeStr,
      duration: String(a.duration),
      status: a.status,
      customerId: a.customerId || "",
      notes: a.notes || "",
    };
  }

  async function handleUpdate(data: AppointmentFormData) {
    setError(null);
    const res = await fetch(`/api/agendamento/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar agendamento");
      return;
    }

    const updated = await res.json();
    setAppointment({ ...appointment!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;

    const res = await fetch(`/api/agendamento/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir agendamento");
      return;
    }
    router.push("/agendamento");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          title="Agendamento não encontrado"
          description={error || "O agendamento solicitado não existe ou foi removido."}
          actionLabel="Voltar para Agendamentos"
          actionHref="/agendamento"
        />
      </div>
    );
  }

  return (
    <div
      className="max-w-[1400px] mx-auto px-6 py-8 space-y-5"
    >
      {error && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-base font-medium"
        >
          {error}
        </div>
      )}

      {editing ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[2.25rem] font-extrabold text-foreground">Editar Agendamento</h1>
              <p className="text-base font-medium text-muted-foreground mt-1">{appointment.title}</p>
            </div>
            <Button variant="outline" onClick={() => setEditing(false)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
              Cancelar
            </Button>
          </div>
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-indigo-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-border/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Dados do Agendamento</h2>
                <p className="text-base text-muted-foreground font-medium">Altere as informações abaixo</p>
              </div>
            </div>
            <div className="p-6">
              <AppointmentForm
                initialData={toFormData(appointment)}
                customers={customers}
                onSubmit={handleUpdate}
                submitLabel="Salvar Alterações"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                  <Calendar className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-[2.25rem] font-extrabold text-foreground">{appointment.title}</h1>
                  <div className="flex items-center gap-3 mt-1 text-base text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> {formatDateTime(appointment.dateTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" /> {appointment.customer?.name || "—"}
                    </span>
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
                <Button variant="ghost" onClick={() => router.push("/agendamento")} className="rounded-lg h-9 hover:bg-muted/50 transition-all duration-150">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-indigo-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-border/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Informações do Agendamento</h2>
                  <p className="text-base text-muted-foreground font-medium">Detalhes completos</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_CLASSES[appointment.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                      {STATUS_LABEL[appointment.status] || appointment.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Data/Hora</p>
                    <p className="text-base text-foreground">{formatDateTime(appointment.dateTime)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Duração</p>
                    <p className="text-base text-foreground">{appointment.duration} minutos</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Cliente</p>
                    <p className="text-base text-foreground">{appointment.customer?.name || "—"}</p>
                  </div>
                  {appointment.customer?.phone && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Telefone</p>
                      <p className="text-base text-foreground">{appointment.customer.phone}</p>
                    </div>
                  )}
                  {appointment.customer?.email && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">E-mail</p>
                      <p className="text-base text-foreground">{appointment.customer.email}</p>
                    </div>
                  )}
                  {appointment.description && (
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</p>
                      <p className="text-base text-foreground">{appointment.description}</p>
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Observações</p>
                      <p className="text-base text-foreground">{appointment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
