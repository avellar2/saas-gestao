import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import { isModuleActive } from "@/lib/module-guard";
import type { ModuleKey } from "@/types";
import { toCsv } from "@/lib/csv-export";

const ENTITY_MODULE_MAP: Record<string, ModuleKey> = {
  customers: "customers",
  quotes: "quotes",
  service_orders: "service_orders",
  products: "inventory",
  financial: "finance",
  appointments: "scheduling",
  catalog: "catalog",
  menu: "menu",
};

const FALLBACK_DATE = new Date(0);

function formatDate(val: Date | null | undefined): string {
  if (!val) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(val);
  } catch {
    return "";
  }
}

function formatDateTime(val: Date | null | undefined): string {
  if (!val) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(val);
  } catch {
    return "";
  }
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>)
    .companyId as string;

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity");

  if (!entity || !ENTITY_MODULE_MAP[entity]) {
    return NextResponse.json(
      { error: "Entidade invalida. Use: customers, quotes, service_orders, products, financial, appointments, catalog, menu" },
      { status: 400 }
    );
  }

  const moduleKey = ENTITY_MODULE_MAP[entity];
  const hasAccess = await isModuleActive(companyId, moduleKey);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Modulo nao ativo" },
      { status: 403 }
    );
  }

  const tenant = tenantPrisma(companyId);

  let headers: string[] = [];
  let rows: string[][] = [];

  switch (entity) {
    case "customers": {
      const data = await tenant.customer.findMany({
        orderBy: { createdAt: "desc" },
      });
      headers = [
        "ID",
        "Nome",
        "Telefone",
        "WhatsApp",
        "Email",
        "Documento",
        "Endereco",
        "Observacoes",
        "Criado em",
      ];
      rows = data.map((item) => [
        item.id,
        item.name || "",
        item.phone || "",
        item.whatsapp || "",
        item.email || "",
        item.document || "",
        item.address || "",
        item.notes || "",
        formatDateTime(item.createdAt),
      ]);
      break;
    }

    case "quotes": {
      const data = await tenant.quote.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true } },
        },
      });
      headers = [
        "Numero",
        "Cliente",
        "Status",
        "Subtotal",
        "Desconto",
        "Total",
        "Valido ate",
        "Observacoes",
        "Criado em",
      ];
      rows = data.map((item) => [
        safeStr(item.number),
        item.customer?.name || "",
        item.status || "",
        safeStr(item.subtotal),
        safeStr(item.discount),
        safeStr(item.total),
        formatDate(item.validUntil),
        item.notes || "",
        formatDateTime(item.createdAt),
      ]);
      break;
    }

    case "service_orders": {
      const data = await tenant.serviceOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true } },
        },
      });
      headers = [
        "Numero",
        "Cliente",
        "Status",
        "Total",
        "Valor Pago",
        "Status Pagamento",
        "Criado em",
      ];
      rows = data.map((item) => [
        safeStr(item.number),
        item.customer?.name || "",
        item.status || "",
        safeStr(item.total),
        safeStr(item.paidAmount),
        item.paymentStatus || "",
        formatDateTime(item.createdAt),
      ]);
      break;
    }

    case "products": {
      const data = await tenant.product.findMany({
        orderBy: { createdAt: "desc" },
      });
      headers = [
        "Nome",
        "SKU",
        "Categoria",
        "Quantidade",
        "Estoque Minimo",
        "Preco Custo",
        "Preco Venda",
        "Descricao",
        "Criado em",
      ];
      rows = data.map((item) => [
        item.name || "",
        item.sku || "",
        item.category || "",
        safeStr(item.quantity),
        safeStr(item.minStock),
        safeStr(item.costPrice),
        safeStr(item.salePrice),
        item.description || "",
        formatDateTime(item.createdAt),
      ]);
      break;
    }

    case "financial": {
      const data = await tenant.financialTransaction.findMany({
        orderBy: { createdAt: "desc" },
      });
      headers = [
        "Tipo",
        "Descricao",
        "Categoria",
        "Valor",
        "Vencimento",
        "Pago em",
        "Status",
        "Observacoes",
        "Criado em",
      ];
      rows = data.map((item) => [
        item.type === "RECEIVABLE" ? "A Receber" : "A Pagar",
        item.description || "",
        item.category || "",
        safeStr(item.amount),
        formatDate(item.dueDate),
        item.paidAt ? formatDateTime(item.paidAt) : "",
        item.status || "",
        item.notes || "",
        formatDateTime(item.createdAt),
      ]);
      break;
    }

    case "appointments": {
      const data = await tenant.appointment.findMany({
        orderBy: { dateTime: "desc" },
        include: {
          customer: { select: { name: true } },
        },
      });
      headers = [
        "Titulo",
        "Cliente",
        "Data/Hora",
        "Duracao (min)",
        "Status",
        "Descricao",
        "Criado em",
      ];
      rows = data.map((item) => [
        item.title || "",
        item.customer?.name || "",
        formatDateTime(item.dateTime),
        safeStr(item.duration),
        item.status || "",
        item.description || "",
        formatDateTime(item.createdAt),
      ]);
      break;
    }

    case "catalog": {
      const data = await tenant.catalogItem.findMany({
        orderBy: { createdAt: "desc" },
      });
      headers = [
        "Nome",
        "Descricao",
        "Categoria",
        "Preco",
        "Ativo",
        "Criado em",
      ];
      rows = data.map((item) => [
        item.name || "",
        item.description || "",
        item.category || "",
        safeStr(item.price),
        item.active ? "Sim" : "Nao",
        formatDateTime(item.createdAt),
      ]);
      break;
    }

    case "menu": {
      const data = await tenant.menuItem.findMany({
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      });
      headers = [
        "Nome",
        "Descricao",
        "Categoria",
        "Preco",
        "Ativo",
        "Ordem",
        "Criado em",
      ];
      rows = data.map((item) => [
        item.name || "",
        item.description || "",
        item.category || "",
        safeStr(item.price),
        item.active ? "Sim" : "Nao",
        safeStr(item.sortOrder),
        formatDateTime(item.createdAt),
      ]);
      break;
    }
  }

  const csv = toCsv(headers, rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entity}-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
