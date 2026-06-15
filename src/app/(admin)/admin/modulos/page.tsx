"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { getModuleConfig, isCoreModule } from "@/lib/modules";

interface ModuleItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  basePrice: string;
  active: boolean;
  sortOrder: number;
}

interface EditingState {
  [key: string]: {
    name: string;
    description: string;
    basePrice: string;
    active: boolean;
    sortOrder: number;
  };
}

const TYPE_LABELS: Record<string, string> = {
  core: "Core",
  common: "Common",
  premium: "Premium",
  addon: "Addon",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Ativo", variant: "default" },
  coming_soon: { label: "Em breve", variant: "secondary" },
  legacy: { label: "Legado", variant: "outline" },
};

export default function ModulosPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState>({});

  useEffect(() => {
    loadModules();
  }, []);

  async function loadModules() {
    setLoading(true);
    try {
      const res = await fetch("/api/modulos");
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch {
      setError("Erro ao carregar modulos");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(mod: ModuleItem) {
    setEditing((prev) => ({
      ...prev,
      [mod.id]: {
        name: mod.name,
        description: mod.description || "",
        basePrice: String(mod.basePrice),
        active: mod.active,
        sortOrder: mod.sortOrder,
      },
    }));
  }

  function cancelEdit(id: string) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleEditChange(
    id: string,
    field: string,
    value: string | boolean
  ) {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function saveEdit(id: string) {
    const data = editing[id];
    if (!data) return;

    setSaving(id);
    setError(null);

    try {
      const res = await fetch("/api/modulos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Erro ao salvar");
        return;
      }

      const updated = await res.json();
      setModules((prev) =>
        prev.map((m) => (m.id === id ? updated : m))
      );
      cancelEdit(id);
    } catch {
      setError("Erro ao salvar modulo");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Módulos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gerencie os módulos disponíveis no sistema
          </p>
        </div>
        <Button variant="outline" onClick={loadModules}>
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Módulos do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ordem</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead>Preço Base</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                    Nenhum módulo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                modules.map((mod) => {
                  const isEditing = editing[mod.id];
                  const config = getModuleConfig(mod.key);
                  const isCore = isCoreModule(mod.key);
                  const typeLabel = config ? TYPE_LABELS[config.type] || config.type : mod.key;
                  const statusInfo = config ? STATUS_LABELS[config.status] || { label: config.status, variant: "secondary" as const } : { label: "-", variant: "secondary" as const };

                  return (
                    <TableRow key={mod.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={isEditing.sortOrder}
                            onChange={(e) =>
                              handleEditChange(mod.id, "sortOrder", e.target.value)
                            }
                            className="w-16 h-8"
                          />
                        ) : (
                          mod.sortOrder
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {mod.key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={isEditing.name}
                            onChange={(e) =>
                              handleEditChange(mod.id, "name", e.target.value)
                            }
                            className="h-8"
                          />
                        ) : (
                          mod.name
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {isEditing ? (
                          <Input
                            value={isEditing.description}
                            onChange={(e) =>
                              handleEditChange(mod.id, "description", e.target.value)
                            }
                            className="h-8"
                          />
                        ) : (
                          mod.description || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={isEditing.basePrice}
                            onChange={(e) =>
                              handleEditChange(mod.id, "basePrice", e.target.value)
                            }
                            className="w-24 h-8"
                          />
                        ) : (
                          `R$ ${parseFloat(mod.basePrice).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Button
                            variant={isEditing.active ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              handleEditChange(mod.id, "active", !isEditing.active)
                            }
                            disabled={isCore}
                          >
                            {isEditing.active ? "Sim" : "Não"}
                          </Button>
                        ) : (
                          <Badge variant={mod.active ? "default" : "secondary"}>
                            {isCore ? "Sempre" : mod.active ? "Ativo" : "Inativo"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isCore ? (
                          <span className="text-xs text-muted-foreground">Core</span>
                        ) : isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveEdit(mod.id)}
                              disabled={saving === mod.id}
                            >
                              {saving === mod.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelEdit(mod.id)}
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(mod)}
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}