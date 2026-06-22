"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CompanyModule {
  id: string;
  moduleKey: string;
  active: boolean;
  activatedAt: string | null;
  deactivatedAt: string | null;
  module: {
    name: string;
    key: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

interface CompanyData {
  id: string;
  name: string;
  tradeName: string | null;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  status: string;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  monthlyPrice: number | null;
  createdAt: string;
  companyModules: CompanyModule[];
  users: User[];
  calculatedPrice: number;
  subscription: {
    status: string;
    monthlyPrice: number;
    modulesCount: number;
    planName: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  TRIAL: "Teste",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSES: Record<string, string> = {
  TRIAL: "bg-blue-100 text-blue-800 border-blue-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  COMPANY_ADMIN: "Admin Empresa",
  STAFF: "Funcionario",
};

export default function EmpresaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorModule, setErrorModule] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [trialEndDate, setTrialEndDate] = useState<string>("");
  const [savingStatus, setSavingStatus] = useState(false);

  const id = params.id as string;

  async function loadCompany() {
    try {
      const res = await fetch(`/api/empresas/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data);
        setSelectedStatus(data.status);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao carregar empresa");
      }
    } catch {
      setError("Erro ao carregar empresa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompany();
  }, [id]);

  async function toggleModule(moduleKey: string, currentActive: boolean) {
    setTogglingModule(moduleKey);
    setErrorModule(null);
    try {
      const res = await fetch(`/api/empresas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, moduleActive: !currentActive }),
      });

      if (res.ok) {
        await loadCompany();
      } else {
        const data = await res.json();
        setErrorModule(data.error || "Erro ao alternar modulo");
      }
    } catch {
      setErrorModule("Erro ao alternar modulo");
    } finally {
      setTogglingModule(null);
    }
  }

  async function handleStatusChange() {
    if (!company || selectedStatus === company.status) return;
    setSavingStatus(true);
    setErrorStatus(null);
    try {
      const body: Record<string, unknown> = { status: selectedStatus };
      if (selectedStatus === "TRIAL" && trialEndDate) {
        body.trialEndsAt = new Date(trialEndDate + "T23:59:59").toISOString();
      }
      const res = await fetch(`/api/empresas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadCompany();
      } else {
        const data = await res.json();
        setErrorStatus(data.error || "Erro ao alterar status");
      }
    } catch {
      setErrorStatus("Erro ao alterar status");
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Empresa nao encontrada</p>
      </div>
    );
  }

  const activeModules = company.companyModules.filter((cm) => cm.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/empresas")}>
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
        <Badge className={STATUS_CLASSES[company.status] || ""}>
          {STATUS_LABELS[company.status] || company.status}
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {errorModule && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {errorModule}
        </div>
      )}

      {errorStatus && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {errorStatus}
        </div>
      )}

      {/* Company Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informacoes da Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {company.tradeName && (
              <div>
                <span className="text-gray-500">Nome Fantasia:</span>{" "}
                <span className="font-medium">{company.tradeName}</span>
              </div>
            )}
            {company.document && (
              <div>
                <span className="text-gray-500">CNPJ/CPF:</span>{" "}
                <span className="font-medium">{company.document}</span>
              </div>
            )}
            {company.email && (
              <div>
                <span className="text-gray-500">E-mail:</span>{" "}
                <span className="font-medium">{company.email}</span>
              </div>
            )}
            {company.phone && (
              <div>
                <span className="text-gray-500">Telefone:</span>{" "}
                <span className="font-medium">{company.phone}</span>
              </div>
            )}
            {company.whatsapp && (
              <div>
                <span className="text-gray-500">WhatsApp:</span>{" "}
                <span className="font-medium">{company.whatsapp}</span>
              </div>
            )}
            {company.address && (
              <div>
                <span className="text-gray-500">Endereco:</span>{" "}
                <span className="font-medium">{company.address}</span>
              </div>
            )}
            {company.trialEndsAt && (
              <div>
                <span className="text-gray-500">Teste ate:</span>{" "}
                <span className="font-medium">
                  {formatDate(company.trialEndsAt)}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Criada em:</span>{" "}
              <span className="font-medium">
                {formatDate(company.createdAt)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Pricing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Status e Preco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-500">Status da Empresa</label>
              <Select value={selectedStatus} onValueChange={(value: string | null) => { if (value !== null) setSelectedStatus(value); }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">Teste</SelectItem>
                  <SelectItem value="ACTIVE">Ativa</SelectItem>
                  <SelectItem value="SUSPENDED">Suspensa</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedStatus === "TRIAL" && (
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Expira em</label>
                <input
                  type="date"
                  value={trialEndDate}
                  onChange={(e) => setTrialEndDate(e.target.value)}
                  className="w-48 h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
            )}
            <Button
              onClick={handleStatusChange}
              disabled={savingStatus || selectedStatus === company.status}
              size="sm"
            >
              {savingStatus ? "Salvando..." : "Salvar Status"}
            </Button>
            <div className="ml-auto text-right">
              <p className="text-sm text-gray-500">Preco Mensal Calculado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(company.calculatedPrice)}
              </p>
              <p className="text-xs text-gray-500">
                {activeModules.length} modulo(s) ativo(s)
                {company.subscription?.planName &&
                  ` - Plano ${company.subscription.planName}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Card */}
      <Card>
        <CardHeader>
          <CardTitle>Modulos ({activeModules.length} ativos)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {company.companyModules.map((cm) => (
              <div
                key={cm.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      cm.active
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }
                  >
                    {cm.active ? "Ativo" : "Inativo"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {cm.module.name}
                  </span>
                </div>
                <Button
                  variant={cm.active ? "outline" : "default"}
                  size="xs"
                  disabled={togglingModule === cm.moduleKey}
                  onClick={() => toggleModule(cm.moduleKey, cm.active)}
                >
                  {togglingModule === cm.moduleKey
                    ? "..."
                    : cm.active
                      ? "Desativar"
                      : "Ativar"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Card */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({company.users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {company.users.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Nenhum usuario cadastrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {ROLE_LABELS[user.role] || user.role}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.active
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }
                      >
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
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