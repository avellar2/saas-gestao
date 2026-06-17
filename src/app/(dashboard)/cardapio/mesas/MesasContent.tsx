"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, QrCode, Copy, Download, CheckCircle, XCircle } from "lucide-react";

interface Table {
  id: string;
  name: string;
  token: string;
  active: boolean;
  _count: { orders: number };
}

export function MesasContent() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    try {
      const res = await fetch("/api/cardapio/mesas");
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/cardapio/config");
      if (res.ok) {
        const data = await res.json();
        setSlug(data.slug);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadTables();
    loadConfig();
  }, [loadTables, loadConfig]);

  async function handleCreate() {
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/cardapio/mesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar mesa");
        return;
      }

      setNewName("");
      setShowCreate(false);
      setError(null);
      await loadTables();
    } catch {
      setError("Erro de conexão");
    }
  }

  async function handleToggleActive(table: Table) {
    try {
      const res = await fetch(`/api/cardapio/mesas/${table.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !table.active }),
      });

      if (res.ok) {
        await loadTables();
      }
    } catch {
      // silently fail
    }
  }

  function getTableUrl(token: string) {
    if (!slug) return null;
    const base = window.location.origin;
    return `${base}/c/${slug}?table=${token}`;
  }

  async function handleCopyLink(token: string) {
    const url = getTableUrl(token);
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(token);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // silently fail
    }
  }

  function handleDownloadQR(token: string, name: string) {
    const svg = document.getElementById(`qr-${token}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${name.replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Mesas / QR Code</h1>
          {slug && (
            <p className="text-base text-muted-foreground mt-2 font-medium">
              Link do cardápio: <a href={`/c/${slug}`} className="text-orange-600 underline" target="_blank">/{slug}</a>
            </p>
          )}
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-lg h-9 bg-orange-600 hover:bg-orange-700 text-white transition-all duration-150 active:scale-[0.97]">
          <Plus className="h-4 w-4 mr-2" />
          Nova Mesa
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      {tables.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Nenhuma mesa cadastrada.</p>
          <p className="text-sm">Crie mesas para gerar QR Codes.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => {
            const url = getTableUrl(table.token);
            return (
              <div
                key={table.id}
                className={`rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-5 space-y-4 ${
                  !table.active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">{table.name}</h3>
                  <button
                    onClick={() => handleToggleActive(table)}
                    className={`p-1.5 rounded-md transition-colors ${
                      table.active
                        ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        : "text-muted-foreground hover:text-destructive hover:bg-red-50"
                    }`}
                    title={table.active ? "Desativar" : "Ativar"}
                  >
                    {table.active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </button>
                </div>

                {url && (
                  <div className="flex justify-center py-2">
                    <QRCodeSVG
                      id={`qr-${table.token}`}
                      value={url}
                      size={140}
                      level="M"
                    />
                  </div>
                )}

                <div className="text-xs text-muted-foreground text-center">
                  {table._count.orders > 0
                    ? `${table._count.orders} pedido(s) ativo(s)`
                    : "Sem pedidos ativos"}
                </div>

                {url && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 rounded-lg h-8 border-border/80 hover:bg-muted/50 transition-all duration-150"
                      onClick={() => handleCopyLink(table.token)}
                    >
                      {copiedId === table.token ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedId === table.token ? "Copiado!" : "Copiar Link"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 rounded-lg h-8 border-border/80 hover:bg-muted/50 transition-all duration-150"
                      onClick={() => handleDownloadQR(table.token, table.name)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar QR
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="tableName">Nome da Mesa</Label>
            <Input
              id="tableName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Mesa 1, Balcão, Jardim..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-lg h-9">
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()} className="rounded-lg h-9 bg-orange-600 hover:bg-orange-700 text-white transition-all duration-150 active:scale-[0.97]">
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
