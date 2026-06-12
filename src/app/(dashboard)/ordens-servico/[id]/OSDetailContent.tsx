"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ServiceOrderForm,
  type ServiceOrderFormData,
} from "@/components/modules/service-order-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  buildWhatsAppLink,
  serviceOrderFinishedMessage,
  serviceOrderDeliveredMessage,
} from "@/lib/whatsapp";
import { MessageCircle, FileDown } from "lucide-react";

interface ServiceOrderItem {
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

interface LinkedQuote {
  id: string;
  number: number;
  status: string;
  total: number;
}

interface ServiceOrderDetail {
  id: string;
  number: number;
  status: string;
  problemDescription: string | null;
  serviceDescription: string | null;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  openedAt: string;
  finishedAt: string | null;
  notes: string | null;
  customerId: string;
  quoteId: string | null;
  customer: CustomerDetail;
  quote: LinkedQuote | null;
  items: ServiceOrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface QuoteOption {
  id: string;
  number: number;
  customerName: string;
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "OPENED":
      return "secondary";
    case "IN_PROGRESS":
      return "outline";
    case "WAITING_PARTS":
      return "outline";
    case "FINISHED":
      return "default";
    case "DELIVERED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "OPENED":
      return "Aberta";
    case "IN_PROGRESS":
      return "Em Andamento";
    case "WAITING_PARTS":
      return "Aguardando Pecas";
    case "FINISHED":
      return "Finalizada";
    case "DELIVERED":
      return "Entregue";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}

function getPaymentVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PAID":
      return "default";
    case "PARTIAL":
      return "outline";
    case "PENDING":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getPaymentLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "PARTIAL":
      return "Parcial";
    case "PAID":
      return "Pago";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

export default function OSDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [so, setSo] = useState<ServiceOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  async function loadServiceOrder() {
    try {
      const res = await fetch(`/api/ordens-servico/${id}`);
      if (!res.ok) {
        setError("Ordem de servico nao encontrada");
        return;
      }
      const data = await res.json();
      setSo(data);
    } catch {
      setError("Erro ao carregar ordem de servico");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServiceOrder();
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

  useEffect(() => {
    async function loadQuotes() {
      try {
        const res = await fetch("/api/orcamentos?status=APPROVED");
        if (res.ok) {
          const data = await res.json();
          setQuotes(
            (Array.isArray(data) ? data : []).map(
              (q: { id: string; number: number; customer: { name: string } }) => ({
                id: q.id,
                number: q.number,
                customerName: q.customer.name,
              })
            )
          );
        }
      } catch {
        // silently fail
      }
    }
    loadQuotes();
  }, []);

  async function handleStatusChange(newStatus: string) {
    if (!so) return;
    setError(null);

    const res = await fetch(`/api/ordens-servico/${id}`, {
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
    setSo({ ...so, ...updated });
  }

  async function handlePayment() {
    if (!so) return;
    setError(null);

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Valor do pagamento invalido");
      return;
    }

    const res = await fetch(`/api/ordens-servico/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentAmount: amount }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao registrar pagamento");
      return;
    }

    const updated = await res.json();
    setSo({ ...so, ...updated });
    setPaymentAmount("");
    setShowPayment(false);
  }

  async function handleUpdate(data: ServiceOrderFormData) {
    setError(null);
    const res = await fetch(`/api/ordens-servico/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar ordem de servico");
      return;
    }

    const updated = await res.json();
    setSo({ ...so!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta ordem de servico?")) return;

    const res = await fetch(`/api/ordens-servico/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir ordem de servico");
      return;
    }
    router.push("/ordens-servico");
    router.refresh();
  }

  function getWhatsAppLinkFinished(): string | null {
    if (!so) return null;
    const phone = so.customer.whatsapp || so.customer.phone;
    if (!phone) return null;
    return buildWhatsAppLink(
      phone,
      serviceOrderFinishedMessage(
        so.customer.name,
        so.number,
        Number(so.total),
        ""
      )
    );
  }

  function getWhatsAppLinkDelivered(): string | null {
    if (!so) return null;
    const phone = so.customer.whatsapp || so.customer.phone;
    if (!phone) return null;
    return buildWhatsAppLink(
      phone,
      serviceOrderDeliveredMessage(so.customer.name, so.number, "")
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!so) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {error || "Ordem de servico nao encontrada"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/ordens-servico")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  const canEdit = so.status === "OPENED" || so.status === "IN_PROGRESS";
  const canDelete = so.status === "OPENED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">OS #{so.number}</h1>
          <Badge variant={getStatusVariant(so.status)}>
            {getStatusLabel(so.status)}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          {so.status === "OPENED" && !editing && (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusChange("IN_PROGRESS")}
              >
                Iniciar
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </>
          )}
          {so.status === "IN_PROGRESS" && !editing && (
            <>
              <Button onClick={() => handleStatusChange("FINISHED")}>
                Finalizar
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Editar
              </Button>
            </>
          )}
          {so.status === "WAITING_PARTS" && (
            <Button onClick={() => handleStatusChange("IN_PROGRESS")}>
              Retomar
            </Button>
          )}
          {so.status === "FINISHED" && (
            <>
              <Button onClick={() => handleStatusChange("DELIVERED")}>
                Marcar Entregue
              </Button>
              {getWhatsAppLinkFinished() && (
                <a
                  href={getWhatsAppLinkFinished()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              )}
            </>
          )}
          {so.status === "DELIVERED" && (
            <>
              {getWhatsAppLinkDelivered() && (
                <a
                  href={getWhatsAppLinkDelivered()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              )}
            </>
          )}
          {so.status !== "CANCELLED" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleStatusChange("CANCELLED")}
            >
              Cancelar
            </Button>
          )}
          <a
            href={`/api/pdf/os/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            <FileDown className="size-4" />
            Baixar PDF
          </a>
          <Button
            variant="outline"
            onClick={() => router.push("/ordens-servico")}
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

      {editing && canEdit ? (
        <ServiceOrderForm
          customers={customers}
          quotes={quotes}
          initialData={{
            customerId: so.customerId,
            quoteId: so.quoteId || "",
            problemDescription: so.problemDescription || "",
            serviceDescription: so.serviceDescription || "",
            notes: so.notes || "",
            items: so.items.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
            })),
          }}
          onSubmit={handleUpdate}
          submitLabel="Salvar Alteracoes"
          paymentStatus={so.paymentStatus}
          paidAmount={Number(so.paidAmount)}
          total={Number(so.total)}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Informacoes da Ordem de Servico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  <span className="font-medium">{so.customer.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={getStatusVariant(so.status)}>
                    {getStatusLabel(so.status)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Pagamento:</span>{" "}
                  <Badge variant={getPaymentVariant(so.paymentStatus)}>
                    {getPaymentLabel(so.paymentStatus)}
                  </Badge>
                  <span className="ml-2">
                    {formatCurrency(Number(so.paidAmount))} /{" "}
                    {formatCurrency(Number(so.total))}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data de Abertura:</span>{" "}
                  <span>{formatDate(so.openedAt)}</span>
                </div>
                {so.finishedAt && (
                  <div>
                    <span className="text-muted-foreground">
                      Data de Finalizacao:
                    </span>{" "}
                    <span>{formatDate(so.finishedAt)}</span>
                  </div>
                )}
                {so.quote && (
                  <div>
                    <span className="text-muted-foreground">
                      Orcamento Vinculado:
                    </span>{" "}
                    <span className="font-medium">#{so.quote.number}</span>
                  </div>
                )}
                {so.problemDescription && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">
                      Descricao do Problema:
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {so.problemDescription}
                    </p>
                  </div>
                )}
                {so.serviceDescription && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">
                      Descricao do Servico:
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {so.serviceDescription}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment section */}
          {so.status !== "CANCELLED" && so.paymentStatus !== "PAID" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pagamento
                  {!showPayment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPayment(true)}
                    >
                      Registrar Pagamento
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              {showPayment && (
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">
                      {formatCurrency(Number(so.total))}
                    </span>
                    <span className="text-muted-foreground ml-4">
                      Pago:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(Number(so.paidAmount))}
                    </span>
                    <span className="text-muted-foreground ml-4">
                      Restante:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(
                        Number(so.total) - Number(so.paidAmount)
                      )}
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="space-y-2 flex-1 max-w-xs">
                      <Label htmlFor="paymentAmount">Valor do Pagamento</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <Button onClick={handlePayment}>Registrar</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPayment(false);
                        setPaymentAmount("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Paid status display */}
          {(so.paymentStatus === "PAID" || so.paymentStatus === "PARTIAL") &&
            !showPayment && (
              <Card>
                <CardHeader>
                  <CardTitle>Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">
                      {formatCurrency(Number(so.total))}
                    </span>
                    <span className="text-muted-foreground ml-4">Pago:</span>
                    <span className="font-medium">
                      {formatCurrency(Number(so.paidAmount))}
                    </span>
                    {so.paymentStatus === "PAID" && (
                      <Badge variant="default" className="ml-2">
                        Pago
                      </Badge>
                    )}
                    {so.paymentStatus === "PARTIAL" && (
                      <>
                        <Badge variant="outline" className="ml-2">
                          Parcial
                        </Badge>
                        <span className="text-muted-foreground ml-4">
                          Restante:
                        </span>
                        <span className="font-medium">
                          {formatCurrency(
                            Number(so.total) - Number(so.paidAmount)
                          )}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPayment(true)}
                        >
                          Registrar Pagamento
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
                {so.items.map((item) => (
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
                <div className="flex items-center gap-4 text-base font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(Number(so.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {so.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{so.notes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}