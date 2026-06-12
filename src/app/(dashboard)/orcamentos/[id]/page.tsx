"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuoteForm, type QuoteFormData } from "@/components/modules/quote-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildWhatsAppLink, quoteWhatsAppMessage } from "@/lib/whatsapp";
import { MessageCircle, FileDown } from "lucide-react";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

interface QuoteDetail {
  id: string;
  number: number;
  status: string;
  description: string | null;
  subtotal: number;
  discount: number;
  total: number;
  validUntil: string | null;
  notes: string | null;
  customerId: string;
  customer: CustomerDetail;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "DRAFT":
      return "secondary";
    case "SENT":
      return "outline";
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "EXPIRED":
      return "secondary";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Rascunho";
    case "SENT":
      return "Enviado";
    case "APPROVED":
      return "Aprovado";
    case "REJECTED":
      return "Rejeitado";
    case "EXPIRED":
      return "Expirado";
    default:
      return status;
  }
}

export default function OrcamentoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  useEffect(() => {
    async function loadQuote() {
      try {
        const res = await fetch(`/api/orcamentos/${id}`);
        if (!res.ok) {
          setError("Orcamento nao encontrado");
          return;
        }
        const data = await res.json();
        setQuote(data);
      } catch {
        setError("Erro ao carregar orcamento");
      } finally {
        setLoading(false);
      }
    }
    loadQuote();
  }, [id]);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/clientes?limit=100");
        if (res.ok) {
          const data = await res.json();
          setCustomers(
            (data.customers || []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        // silently fail
      }
    }
    loadCustomers();
  }, []);

  async function handleStatusChange(newStatus: string) {
    if (!quote) return;
    setError(null);

    const res = await fetch(`/api/orcamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar status");
      return;
    }

    const updated = await res.json();
    setQuote({ ...quote, ...updated });
  }

  async function handleConvertToServiceOrder() {
    if (!quote) return;
    setError(null);

    const res = await fetch(`/api/orcamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convertToServiceOrder: true }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao converter em OS");
      return;
    }

    router.push("/ordens-servico");
    router.refresh();
  }

  async function handleUpdate(data: QuoteFormData) {
    setError(null);
    const res = await fetch(`/api/orcamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar orcamento");
      return;
    }

    const updated = await res.json();
    setQuote({ ...quote!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este orcamento?")) return;

    const res = await fetch(`/api/orcamentos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir orcamento");
      return;
    }
    router.push("/orcamentos");
    router.refresh();
  }

  function getWhatsAppLink(): string | null {
    if (!quote) return null;
    const phone = quote.customer.whatsapp || quote.customer.phone;
    if (!phone) return null;
    return buildWhatsAppLink(
      phone,
      quoteWhatsAppMessage(
        quote.customer.name,
        quote.number,
        Number(quote.total),
        "" // Company name not available on client
      )
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {error || "Orcamento nao encontrado"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/orcamentos")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Orcamento #{quote.number}</h1>
          <Badge variant={getStatusVariant(quote.status)}>
            {getStatusLabel(quote.status)}
          </Badge>
        </div>
        <div className="flex gap-2">
          {quote.status === "DRAFT" && !editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button onClick={() => handleStatusChange("SENT")}>
                Enviar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </>
          )}
          {quote.status === "SENT" && (
            <>
              <Button onClick={() => handleStatusChange("APPROVED")}>
                Aprovar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleStatusChange("REJECTED")}
              >
                Rejeitar
              </Button>
            </>
          )}
          {quote.status === "APPROVED" && (
            <Button onClick={handleConvertToServiceOrder}>
              Converter em OS
            </Button>
          )}
          {getWhatsAppLink() && (
            <Button
              variant="outline"
              render={<a href={getWhatsAppLink()!} target="_blank" rel="noopener noreferrer" />}
            >
              <MessageCircle className="size-4 mr-1" />
              WhatsApp
            </Button>
          )}
          <a
            href={`/api/pdf/orcamento/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            <FileDown className="size-4" />
            Baixar PDF
          </a>
          <Button
            variant="outline"
            onClick={() => router.push("/orcamentos")}
          >
            Voltar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {editing && quote.status === "DRAFT" ? (
        <QuoteForm
          customers={customers}
          initialData={{
            customerId: quote.customerId,
            description: quote.description || "",
            validUntil: quote.validUntil
              ? new Date(quote.validUntil).toISOString().split("T")[0]
              : "",
            discount: Number(quote.discount),
            notes: quote.notes || "",
            items: quote.items.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
            })),
          }}
          onSubmit={handleUpdate}
          submitLabel="Salvar Alteracoes"
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Informacoes do Orcamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  <span className="font-medium">{quote.customer.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={getStatusVariant(quote.status)}>
                    {getStatusLabel(quote.status)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Validade:</span>{" "}
                  <span>
                    {quote.validUntil
                      ? formatDate(quote.validUntil)
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>{" "}
                  <span>{formatDate(quote.createdAt)}</span>
                </div>
                {quote.description && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Descricao:</span>{" "}
                    <span>{quote.description}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                  <div className="col-span-5">Descricao</div>
                  <div className="col-span-2">Qtd</div>
                  <div className="col-span-2">Preco Unit.</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                {quote.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 text-sm py-1"
                  >
                    <div className="col-span-5">{item.description}</div>
                    <div className="col-span-2">{Number(item.quantity)}</div>
                    <div className="col-span-2">
                      {formatCurrency(Number(item.unitPrice))}
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      {formatCurrency(Number(item.total))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-end gap-2 pt-4 border-t mt-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(Number(quote.subtotal))}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="font-medium">
                    {formatCurrency(Number(quote.discount))}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-base font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(Number(quote.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}