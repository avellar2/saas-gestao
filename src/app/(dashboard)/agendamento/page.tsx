import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { SortSelect } from "@/components/sort-select";
import { EmptyState } from "@/components/empty-state";
import { Calendar } from "lucide-react";

interface SearchParams {
  search?: string;
  status?: string;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

const STATUS_TABS = [
  { value: "", label: "Todos" },
  { value: "SCHEDULED", label: "Agendado" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "COMPLETED", label: "Concluido" },
];

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluido",
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function AgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "scheduling");
  if (!hasAccess) redirect("/upgrade?module=scheduling");

  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "";
  const sort = params.sort || "dateTime_desc";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }
  if (status) {
    where.status = status;
  }
  if (dateFrom || dateTo) {
    const dateTimeFilter: Record<string, Date> = {};
    if (dateFrom) dateTimeFilter.gte = new Date(dateFrom);
    if (dateTo) dateTimeFilter.lte = new Date(dateTo);
    where.dateTime = dateTimeFilter;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [appointments, total] = await Promise.all([
    tenant.appointment.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    }),
    tenant.appointment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agendamentos</h1>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=appointments" download>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/agendamento/novo">
            <Button>Novo Agendamento</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2 flex-1" action="/agendamento" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por titulo..."
            defaultValue={search}
            className="flex-1 h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
          <input
            name="dateFrom"
            type="date"
            defaultValue={dateFrom}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span className="text-sm text-muted-foreground">ate</span>
          <input
            name="dateTo"
            type="date"
            defaultValue={dateTo}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {status && <input type="hidden" name="status" value={status} />}
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        <SortSelect
          options={[
            { value: "dateTime_desc", label: "Mais recentes" },
            { value: "dateTime_asc", label: "Mais antigos" },
            { value: "title_asc", label: "Titulo A-Z" },
          ]}
          defaultValue={sort}
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value;
          const linkParams = new URLSearchParams();
          if (search) linkParams.set("search", search);
          if (sort !== "dateTime_desc") linkParams.set("sort", sort);
          if (dateFrom) linkParams.set("dateFrom", dateFrom);
          if (dateTo) linkParams.set("dateTo", dateTo);
          linkParams.set("status", tab.value);
          linkParams.set("page", "1");
          const href = `/agendamento?${linkParams.toString()}`;
          return (
            <Link key={tab.value} href={href}>
              <Button variant={isActive ? "default" : "outline"} size="sm">
                {tab.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {appointments.length === 0 ? (
        <EmptyState icon={Calendar}
          title={search ? "Nenhum resultado" : "Nenhum agendamento"}
          description={search ? "Tente ajustar os termos da busca." : "Crie seu primeiro agendamento para começar."}
          actionLabel="Novo Agendamento"
          actionHref="/agendamento/novo"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Duracao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {appointment.title}
                    </TableCell>
                    <TableCell>
                      {appointment.customer?.name || "-"}
                    </TableCell>
                    <TableCell>{formatDateTime(appointment.dateTime)}</TableCell>
                    <TableCell>{appointment.duration} min</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_BADGE[appointment.status] || "secondary"
                        }
                      >
                        {STATUS_LABEL[appointment.status] || appointment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/agendamento/${appointment.id}`}>
                        <Button variant="outline" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => {
                  const linkParams = new URLSearchParams();
                  if (search) linkParams.set("search", search);
                  if (status) linkParams.set("status", status);
                  if (sort !== "dateTime_desc") linkParams.set("sort", sort);
                  if (dateFrom) linkParams.set("dateFrom", dateFrom);
                  if (dateTo) linkParams.set("dateTo", dateTo);
                  linkParams.set("page", String(p));
                  return (
                    <Link
                      key={p}
                      href={`/agendamento?${linkParams.toString()}`}
                    >
                      <Button
                        variant={p === page ? "default" : "outline"}
                        size="sm"
                      >
                        {p}
                      </Button>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
