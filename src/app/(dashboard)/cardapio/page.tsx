import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, Plus, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { SortSelect } from "@/components/sort-select";
import { EmptyState } from "@/components/empty-state";

interface SearchParams {
  search?: string;
  category?: string;
  sort?: string;
  page?: string;
}

export default async function CardapioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>)
    .companyId as string;
  const hasAccess = await isModuleActive(companyId, "menu");
  if (!hasAccess) redirect("/upgrade?module=menu");

  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const search = params.search || "";
  const categoryFilter = params.category || "";
  const sort = params.sort || "sortOrder_asc";
  const page = parseInt(params.page || "1", 10);
  const limit = 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (categoryFilter) {
    where.category = categoryFilter;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [items, total, categories] = await Promise.all([
    tenant.menuItem.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    tenant.menuItem.count({ where }),
    tenant.menuItem.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const groupedByCategory: Record<string, typeof items> = {};
  const uncategorized: typeof items = [];

  for (const item of items) {
    const cat = item.category || "__uncategorized__";
    if (cat === "__uncategorized__") {
      uncategorized.push(item);
    } else {
      if (!groupedByCategory[cat]) {
        groupedByCategory[cat] = [];
      }
      groupedByCategory[cat].push(item);
    }
  }

  const categoryList = categories
    .map((c) => c.category)
    .filter(Boolean) as string[];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Cardápio Digital</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">{total} {total === 1 ? "item" : "itens"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="/api/exportar?entity=menu" download>
            <Button variant="outline" size="sm" className="gap-2 h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/cardapio/novo">
            <Button size="sm" className="gap-2 h-9 px-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-all duration-150 active:scale-[0.97]">
              <Plus className="h-4 w-4" />
              Novo Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2 flex-1" action="/cardapio" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por nome, descrição ou categoria..."
            defaultValue={search}
            className="flex-1 h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 placeholder:text-muted-foreground/60"
          />
          <Button type="submit" variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
            Buscar
          </Button>
        </form>
        <SortSelect
          options={[
            { value: "sortOrder_asc", label: "Ordem padrão" },
            { value: "name_asc", label: "Nome A-Z" },
            { value: "name_desc", label: "Nome Z-A" },
            { value: "price_asc", label: "Menor preço" },
            { value: "price_desc", label: "Maior preço" },
          ]}
          defaultValue={sort}
        />
      </div>

      {/* Category filter pills */}
      {categoryList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/cardapio">
            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none ${
              categoryFilter === ""
                ? "bg-orange-50 border-orange-200 text-orange-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
            }`}>
              Todas
            </span>
          </Link>
          {categoryList.map((cat) => {
            const linkParams = new URLSearchParams();
            linkParams.set("category", cat!);
            if (sort !== "sortOrder_asc") linkParams.set("sort", sort);
            return (
              <Link
                key={cat}
                href={`/cardapio?${linkParams.toString()}`}
              >
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none ${
                  categoryFilter === cat
                    ? "bg-orange-50 border-orange-200 text-orange-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                }`}>
                  {cat}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon="UtensilsCrossed"
          title={search ? "Nenhum resultado" : "Nenhum item"}
          description={search ? "Tente ajustar os termos da busca." : "Adicione seu primeiro item ao cardápio."}
          actionLabel="Novo Item"
          actionHref="/cardapio/novo"
        />
      ) : (
        <>
          {uncategorized.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground mb-2">Sem Categoria</h2>
              <CardapioTable items={uncategorized} />
            </div>
          )}

          {Object.entries(groupedByCategory).map(([category, catItems]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground mb-2">{category}</h2>
              <CardapioTable items={catItems} />
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => {
                  const linkParams = new URLSearchParams();
                  if (search) linkParams.set("search", search);
                  if (categoryFilter) linkParams.set("category", categoryFilter);
                  if (sort !== "sortOrder_asc") linkParams.set("sort", sort);
                  linkParams.set("page", String(p));
                  return (
                    <Link
                      key={p}
                      href={`/cardapio?${linkParams.toString()}`}
                    >
                      <span className={`inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer select-none ${
                        p === page
                          ? "bg-orange-600 border-orange-600 text-white"
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

function CardapioTable({
  items,
}: {
  items: {
    id: string;
    name: string;
    price: unknown;
    sortOrder: number;
    active: boolean;
    imageUrl: string | null;
    description: string | null;
  }[];
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
              <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Nome</TableHead>
              <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</TableHead>
              <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Preço</TableHead>
              <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Ordem</TableHead>
              <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Ativo</TableHead>
              <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="group border-b border-border/30 transition-colors duration-150 hover:bg-orange-50/30 last:border-b-0">
                <TableCell className="py-3.5 pl-5 pr-3 text-sm font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <span>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 px-3 text-sm text-muted-foreground max-w-xs truncate">
                  {item.description || "—"}
                </TableCell>
                <TableCell className="py-3.5 px-3 text-sm font-semibold text-foreground">{formatCurrency(Number(item.price))}</TableCell>
                <TableCell className="py-3.5 px-3 text-sm text-foreground">{item.sortOrder}</TableCell>
                <TableCell className="py-3.5 px-3 text-sm">
                  <Badge variant={item.active ? "default" : "secondary"} className="rounded-full text-xs font-medium">
                    {item.active ? "Sim" : "Não"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3.5 pl-3 pr-5 text-right">
                  <Link href={`/cardapio/${item.id}`}>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-orange-600 hover:bg-orange-50 transition-all duration-150">
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
  );
}
