"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, Globe } from "lucide-react";

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
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Configurar Cardápio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defina o link público do seu cardápio digital.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border p-6">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug do Cardápio</Label>
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

        <Button onClick={handleSave} disabled={saving || !slug.trim()}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {publicUrl && (
        <div className="space-y-3 rounded-xl border p-6">
          <h2 className="font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Link do Cardápio
          </h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-muted rounded-lg px-3 py-2">
              {typeof window !== "undefined" ? window.location.origin : ""}
              {publicUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopyUrl} className="gap-1">
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
      )}
    </div>
  );
}
