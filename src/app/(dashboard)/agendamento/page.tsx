import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, ChevronRight } from "lucide-react";
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
  { value: "COMPLETED", label: "Concluído" },
];

const STATUS_CLASSES: Record<string, string> = {
  SCHEDULED: "bg-slate-50 text-slate-700 border-slate-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
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
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Agendamentos</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">{total} {total === 1 ? "agendamento" : "agendamentos"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="/api/exportar?entity=appointments" download>
            <Button variant="outline" size="sm" className="gap-2 h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/agendamento/novo">
            <Button size="sm" className="gap-2 h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-150 active:scale-[0.97]">
              Novo Agendamento
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2 flex-1" action="/agendamento" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por título..."
            defaultValue={search}
            className="flex-1 h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 placeholder:text-muted-foreground/60"
          />
          <input
            name="dateFrom"
            type="date"
            defaultValue={dateFrom}
            className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          />
          <span className="text-sm text-muted-foreground self-center">até</span>
          <input
            name="dateTo"
            type="date"
            defaultValue={dateTo}
            className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          />
          {status && <input type="hidden" name="status" value={status} />}
          <Button type="submit" variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
            Buscar
          </Button>
        </form>
        <SortSelect
          options={[
            { value: "dateTime_desc", label: "Mais recentes" },
            { value: "dateTime_asc", label: "Mais antigos" },
            { value: "title_asc", label: "Título A-Z" },
          ]}
          defaultValue={sort}
        />
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
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
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none ${
                isActive
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
              }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>

      {appointments.length === 0 ? (
        <EmptyState icon="Calendar"
          title={search ? "Nenhum resultado" : "Nenhum agendamento"}
          description={search ? "Tente ajustar os termos da busca." : "Crie seu primeiro agendamento para começar."}
          actionLabel="Novo Agendamento"
          actionHref="/agendamento/novo"
        />
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
                    <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Título</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Cliente</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Data/Hora</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Duração</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</TableHead>
                    <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id} className="group border-b border-border/30 transition-colors duration-150 hover:bg-indigo-50/30 last:border-b-0">
                      <TableCell className="py-3.5 pl-5 pr-3 text-sm font-medium text-foreground">{appointment.title}</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">{appointment.customer?.name || "—"}</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">{formatDateTime(appointment.dateTime)}</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">{appointment.duration} min</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_CLASSES[appointment.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                          {STATUS_LABEL[appointment.status] || appointment.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 pl-3 pr-5 text-right">
                        <Link href={`/agendamento/${appointment.id}`}>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150">
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                      <span className={`inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer select-none ${
                        p === page
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                      }`}>
                        {p}
                      </span>
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
