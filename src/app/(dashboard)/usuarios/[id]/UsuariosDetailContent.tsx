"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UsuarioForm, type UsuarioFormData } from "@/components/modules/usuario-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";

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
          setError("Usuario nao encontrado");
          return;
        }
        const data = await res.json();
        setUsuario(data);
      } catch {
        setError("Erro ao carregar usuario");
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
      setError(body.error || "Erro ao atualizar usuario");
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
      ? "Tem certeza que deseja ativar este usuario?"
      : "Tem certeza que deseja desativar este usuario?";

    if (!confirm(confirmMsg)) return;

    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao alterar status do usuario");
      return;
    }

    const updated = await res.json();
    setUsuario({ ...usuario!, ...updated });
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este usuario?")) return;

    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir usuario");
      return;
    }
    router.push("/usuarios");
    router.refresh();
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!usuario) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {error || "Usuario nao encontrado"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/usuarios")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{usuario.name}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancelar" : "Editar"}
          </Button>
          {!editing && (
            <>
              <Button
                variant={usuario.active ? "secondary" : "default"}
                onClick={handleToggleActive}
              >
                {usuario.active ? "Desativar" : "Ativar"}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </>
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
            <CardTitle>Editar Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <UsuarioForm
              initialData={{
                name: usuario.name,
                email: usuario.email,
                role: usuario.role as "COMPANY_ADMIN" | "STAFF",
                active: usuario.active,
                password: "",
              }}
              onSubmit={handleUpdate}
              submitLabel="Salvar Alteracoes"
              isEdit
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>{" "}
                <span>{usuario.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">E-mail:</span>{" "}
                <span>{usuario.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Funcao:</span>{" "}
                <Badge variant="secondary">
                  {ROLE_LABELS[usuario.role] || usuario.role}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge variant={usuario.active ? "default" : "secondary"}>
                  {usuario.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Criado em:</span>{" "}
                <span>{formatDate(usuario.createdAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Atualizado em:</span>{" "}
                <span>{formatDate(usuario.updatedAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
