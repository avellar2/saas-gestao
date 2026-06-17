import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { SortSelect } from "@/components/sort-select";
import { EmptyState } from "@/components/empty-state";

interface SearchParams {
  search?: string;
  sort?: string;
  page?: string;
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "catalog");
  if (!hasAccess) redirect("/upgrade?module=catalog");

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
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [items, total] = await Promise.all([
    tenant.catalogItem.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    tenant.catalogItem.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Catálogo WhatsApp</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">{total} {total === 1 ? "item" : "itens"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="/api/exportar?entity=catalog" download>
            <Button variant="outline" size="sm" className="gap-2 h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/catalogo/novo">
            <Button size="sm" className="gap-2 h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all duration-150 active:scale-[0.97]">
              Novo Item
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2 flex-1" action="/catalogo" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por nome ou categoria..."
            defaultValue={search}
            className="flex-1 h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 placeholder:text-muted-foreground/60"
          />
          <Button type="submit" variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
            Buscar
          </Button>
        </form>
        <SortSelect
          options={[
            { value: "createdAt_desc", label: "Mais recentes" },
            { value: "name_asc", label: "Nome A-Z" },
            { value: "name_desc", label: "Nome Z-A" },
            { value: "price_asc", label: "Menor preço" },
            { value: "price_desc", label: "Maior preço" },
          ]}
          defaultValue={sort}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState icon="ShoppingBag"
          title={search ? "Nenhum resultado" : "Nenhum item"}
          description={search ? "Tente ajustar os termos da busca." : "Cadastre seu primeiro item do catálogo."}
          actionLabel="Novo Item"
          actionHref="/catalogo/novo"
        />
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
                    <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Nome</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Categoria</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Preço</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Ativo</TableHead>
                    <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="group border-b border-border/30 transition-colors duration-150 hover:bg-teal-50/30 last:border-b-0">
                      <TableCell className="py-3.5 pl-5 pr-3 text-sm font-medium text-foreground">{item.name}</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">{item.category || "—"}</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm font-semibold text-foreground">{formatCurrency(Number(item.price))}</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm">
                        {item.active ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">Ativo</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">Inativo</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/catalogo/${item.id}`}>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-teal-600 hover:bg-teal-50 transition-all duration-150">
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </Link>
                        </div>
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
                  if (sort !== "createdAt_desc") linkParams.set("sort", sort);
                  linkParams.set("page", String(p));
                  return (
                    <Link
                      key={p}
                      href={`/catalogo?${linkParams.toString()}`}
                    >
                      <span className={`inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer select-none ${
                        p === page
                          ? "bg-teal-600 border-teal-600 text-white"
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
