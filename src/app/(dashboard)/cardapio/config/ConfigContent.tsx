"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, Globe, Settings } from "lucide-react";

export function ConfigContent() {
  const [slug, setSlug] = useState("");
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cardapio/config");
        if (res.ok) {
          const data = await res.json();
          setCurrentSlug(data.slug);
          setSlug(data.slug || "");
          setPublicUrl(data.publicUrl);
        }
      } catch {
        // silently fail
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/cardapio/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Erro ao salvar" });
        return;
      }

      setCurrentSlug(data.slug);
      setPublicUrl(data.publicUrl);
      setMessage({ type: "success", text: "Slug salvo com sucesso!" });
    } catch {
      setMessage({ type: "error", text: "Erro de conexão" });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyUrl() {
    if (!publicUrl) return;
    const url = `${window.location.origin}${publicUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Configurar Cardápio</h1>
        <p className="text-base text-muted-foreground mt-2 font-medium">Defina o link público do seu cardápio digital.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 bg-orange-50/40 dark:bg-orange-950/20 border-b border-border/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Slug do Cardápio</h2>
              <p className="text-base text-muted-foreground font-medium">URL amigável para acesso público</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {typeof window !== "undefined" ? window.location.origin : ""}/c/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, "").toLowerCase())}
                  placeholder="ex: restaurante-joao"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens.
              </p>
            </div>

            {message && (
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {message.text}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving || !slug.trim()} className="rounded-lg h-9 bg-orange-600 hover:bg-orange-700 text-white transition-all duration-150 active:scale-[0.97]">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {publicUrl && (
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 bg-orange-50/40 dark:bg-orange-950/20 border-b border-border/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Link do Cardápio</h2>
                <p className="text-base text-muted-foreground font-medium">Compartilhe com seus clientes</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted rounded-lg px-3 py-2">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  {publicUrl}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyUrl} className="gap-1 rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
                  {copied ? (
                    <><CheckCircle className="h-4 w-4" /> Copiado!</>
                  ) : (
                    <><Copy className="h-4 w-4" /> Copiar</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartilhe este link ou gere QR Codes para cada mesa.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
