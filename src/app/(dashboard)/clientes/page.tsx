import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, Plus, ChevronRight, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortSelect } from "@/components/sort-select";
import { EmptyState } from "@/components/empty-state";

interface SearchParams {
  search?: string;
  sort?: string;
  page?: string;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "customers");
  if (!hasAccess) redirect("/upgrade?module=customers");

  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const search = params.search || "";
  const sort = params.sort || "createdAt_desc";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { whatsapp: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [customers, total] = await Promise.all([
    tenant.customer.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    tenant.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[2.25rem] font-extrabold text-foreground">Clientes</h1>
          <p className="text-base font-medium text-muted-foreground mt-1">{total} {total === 1 ? "cliente" : "clientes"} cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=customers" download>
            <Button variant="outline" className="rounded-lg h-9 px-3.5 border-border/80 hover:bg-muted/50 transition-all duration-150">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </a>
          <Link href="/clientes/novo">
            <Button className="rounded-lg h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-150 active:scale-[0.97]">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2 flex-1" action="/clientes" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por nome, telefone ou WhatsApp..."
            defaultValue={search}
            className="flex-1 h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/20 placeholder:text-muted-foreground/60 transition-colors"
          />
          <Button type="submit" variant="outline" className="rounded-lg h-9 px-3.5 border-border/80 hover:bg-muted/50 transition-all duration-150">
            Buscar
          </Button>
        </form>
        <SortSelect
          options={[
            { value: "createdAt_desc", label: "Mais recentes" },
            { value: "name_asc", label: "Nome A-Z" },
            { value: "name_desc", label: "Nome Z-A" },
          ]}
          defaultValue={sort}
        />
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title={search ? "Nenhum resultado" : "Nenhum cliente cadastrado"}
          description={
            search
              ? "Nenhum cliente encontrado para essa busca."
              : "Cadastre seus clientes para comecar a gerenciar."
          }
          icon="Users"
          actionLabel="Novo Cliente"
          actionHref="/clientes/novo"
        />
      ) : (
        <>
          {/* Table */}
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 transition-colors">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Telefone</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">WhatsApp</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Email</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer border-b border-border/30 last:border-0"
                    >
                      <TableCell className="text-sm text-foreground font-medium px-4 py-3.5">{customer.name}</TableCell>
                      <TableCell className="text-sm text-foreground px-4 py-3.5">{customer.phone || "-"}</TableCell>
                      <TableCell className="text-sm text-foreground px-4 py-3.5">{customer.whatsapp || "-"}</TableCell>
                      <TableCell className="text-sm text-foreground px-4 py-3.5">{customer.email || "-"}</TableCell>
                      <TableCell className="text-sm text-foreground px-4 py-3.5 text-right">
                        <Link href={`/clientes/${customer.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/clientes?search=${encodeURIComponent(search)}&page=${p}`}
                >
                  <span
                    className={`inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2.5 rounded-lg text-sm font-medium border cursor-pointer transition-all duration-150 ${
                      p === page
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {p}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
