"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ClientForm, type ClientFormData } from "@/components/modules/client-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";

interface QuoteHistory {
  id: string;
  number: number;
  status: string;
  total: number;
  createdAt: string;
}

interface ServiceOrderHistory {
  id: string;
  number: number;
  status: string;
  total: number;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  quotes: QuoteHistory[];
  serviceOrders: ServiceOrderHistory[];
}

export default function ClienteDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const res = await fetch(`/api/clientes/${id}`);
        if (!res.ok) {
          setError("Cliente nao encontrado");
          return;
        }
        const data = await res.json();
        setCustomer(data);
      } catch {
        setError("Erro ao carregar cliente");
      } finally {
        setLoading(false);
      }
    }
    loadCustomer();
  }, [id]);

  async function handleUpdate(data: ClientFormData) {
    setError(null);
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar cliente");
      return;
    }

    const updated = await res.json();
    setCustomer({ ...customer!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir cliente");
      return;
    }
    router.push("/clientes");
    router.refresh();
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Cliente nao encontrado"
        description={error || "O cliente solicitado nao existe ou foi removido."}
        actionLabel="Voltar para Clientes"
        actionHref="/clientes"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{customer.name}</h1>
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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm"
        >
          {error}
        </motion.div>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm
              initialData={{
                name: customer.name,
                phone: customer.phone || "",
                whatsapp: customer.whatsapp || "",
                email: customer.email || "",
                document: customer.document || "",
                address: customer.address || "",
                notes: customer.notes || "",
              }}
              onSubmit={handleUpdate}
              submitLabel="Salvar Alteracoes"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Telefone:</span>{" "}
                <span>{customer.phone || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">WhatsApp:</span>{" "}
                <span>{customer.whatsapp || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">E-mail:</span>{" "}
                <span>{customer.email || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CPF/CNPJ:</span>{" "}
                <span>{customer.document || "-"}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Endereco:</span>{" "}
                <span>{customer.address || "-"}</span>
              </div>
              {customer.notes && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Observacoes:</span>{" "}
                  <span>{customer.notes}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Orcamentos ({customer.quotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.quotes.length === 0 ? (
            <div className="py-8">
              <p className="text-sm text-muted-foreground text-center">
                Nenhum orcamento para este cliente.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>#{quote.number}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{quote.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(quote.total)}</TableCell>
                    <TableCell>{formatDate(quote.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Ordens de Servico ({customer.serviceOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.serviceOrders.length === 0 ? (
            <div className="py-8">
              <p className="text-sm text-muted-foreground text-center">
                Nenhuma ordem de servico para este cliente.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.serviceOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.number}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}