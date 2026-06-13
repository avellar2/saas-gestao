"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export interface AppointmentFormData {
  title: string;
  description: string;
  dateTime: string;
  duration: string;
  status: string;
  customerId: string;
  notes: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface AppointmentFormProps {
  initialData?: Partial<AppointmentFormData>;
  customers: CustomerOption[];
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  submitLabel?: string;
}

const STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Agendado" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "COMPLETED", label: "Concluido" },
];

export function AppointmentForm({
  initialData,
  customers,
  onSubmit,
  submitLabel = "Salvar",
}: AppointmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    dateTime: initialData?.dateTime || "",
    duration: initialData?.duration || "60",
    status: initialData?.status || "SCHEDULED",
    customerId: initialData?.customerId || "",
    notes: initialData?.notes || "",
  });

  function handleChange(field: keyof AppointmentFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Titulo *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            required
            placeholder="Titulo do agendamento"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerId">Cliente</Label>
          <Select
            value={formData.customerId}
            onValueChange={(value: string | null) =>
              handleChange("customerId", value || "")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTime">Data e Hora *</Label>
          <Input
            id="dateTime"
            type="datetime-local"
            value={formData.dateTime}
            onChange={(e) => handleChange("dateTime", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duracao (minutos)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => handleChange("duration", e.target.value)}
            placeholder="60"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: string | null) =>
              handleChange("status", value || "SCHEDULED")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descricao</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Descricao do agendamento"
          rows={3}
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observacoes</Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Observacoes adicionais"
          rows={3}
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
