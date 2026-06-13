import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, Plus, Users } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua base de clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=customers" download>
            <Button variant="outline" className="rounded-xl">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/clientes/novo">
            <Button className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2 flex-1" action="/clientes" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por nome, telefone ou WhatsApp..."
            defaultValue={search}
            className="flex-1 h-10 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 placeholder:text-muted-foreground/60 transition-colors"
          />
          <Button type="submit" variant="outline" className="rounded-xl">
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
          icon={Users}
          actionLabel="Novo Cliente"
          actionHref="/clientes/novo"
        />
      ) : (
        <>
          <div className="rounded-[1.25rem] border border-border/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 transition-colors">
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell>{customer.whatsapp || "-"}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>
                        <Link href={`/clientes/${customer.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg">
                            Ver
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Link
                    key={p}
                    href={`/clientes?search=${encodeURIComponent(search)}&page=${p}`}
                  >
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="rounded-lg min-w-[2.25rem]"
                    >
                      {p}
                    </Button>
                  </Link>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
