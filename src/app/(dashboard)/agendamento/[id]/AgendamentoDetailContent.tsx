"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AppointmentForm,
  type AppointmentFormData,
} from "@/components/modules/appointment-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";

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

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluido",
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
          setError("Agendamento nao encontrado");
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
    return <DetailSkeleton />;
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {error || "Agendamento nao encontrado"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/agendamento")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{appointment.title}</h1>
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
            <CardTitle>Editar Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentForm
              initialData={toFormData(appointment)}
              customers={customers}
              onSubmit={handleUpdate}
              submitLabel="Salvar Alteracoes"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Titulo:</span>{" "}
                <span>{appointment.title}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge
                  variant={STATUS_BADGE[appointment.status] || "secondary"}
                >
                  {STATUS_LABEL[appointment.status] || appointment.status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Data/Hora:</span>{" "}
                <span>{formatDateTime(appointment.dateTime)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duracao:</span>{" "}
                <span>{appointment.duration} minutos</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>{" "}
                <span>{appointment.customer?.name || "-"}</span>
              </div>
              {appointment.customer && (
                <div>
                  <span className="text-muted-foreground">Contato:</span>{" "}
                  <span>
                    {appointment.customer.phone ||
                      appointment.customer.whatsapp ||
                      appointment.customer.email ||
                      "-"}
                  </span>
                </div>
              )}
              {appointment.description && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Descricao:</span>{" "}
                  <span>{appointment.description}</span>
                </div>
              )}
              {appointment.notes && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Observacoes:</span>{" "}
                  <span>{appointment.notes}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
