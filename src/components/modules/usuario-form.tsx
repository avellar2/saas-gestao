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

export interface UsuarioFormData {
  name: string;
  email: string;
  password: string;
  role: "COMPANY_ADMIN" | "STAFF";
  active: boolean;
}

interface UsuarioFormProps {
  initialData?: Partial<UsuarioFormData>;
  onSubmit: (data: UsuarioFormData) => Promise<void>;
  submitLabel?: string;
  isEdit?: boolean;
}

export function UsuarioForm({
  initialData,
  onSubmit,
  submitLabel = "Salvar",
  isEdit = false,
}: UsuarioFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UsuarioFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: initialData?.password || "",
    role: initialData?.role || "STAFF",
    active: initialData?.active ?? true,
  });

  function handleChange(field: keyof UsuarioFormData, value: string | boolean) {
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
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="Nome do usuario"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Senha {isEdit ? "(deixe em branco para manter)" : "*"}
          </Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            required={!isEdit}
            minLength={isEdit ? undefined : 6}
            placeholder={isEdit ? "Nova senha" : "Minimo 6 caracteres"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Funcao</Label>
          <Select
            value={formData.role}
            onValueChange={(val) =>
              val && handleChange("role", val as "COMPANY_ADMIN" | "STAFF")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma funcao" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPANY_ADMIN">Administrador</SelectItem>
              <SelectItem value="STAFF">Colaborador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            checked={formData.active}
            onChange={(e) => handleChange("active", e.target.checked)}
            className="h-4 w-4 rounded border border-input accent-primary"
          />
          <Label htmlFor="active" className="cursor-pointer">
            Usuario ativo
          </Label>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
