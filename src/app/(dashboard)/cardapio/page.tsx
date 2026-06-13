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
import { formatCurrency } from "@/lib/utils";
import { SortSelect } from "@/components/sort-select";
import { EmptyState } from "@/components/empty-state";
import { UtensilsCrossed } from "lucide-react";

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

  // Fetch items and categories in parallel
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

  // Group items by category
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cardapio Digital</h1>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=menu" download>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/cardapio/novo">
            <Button>Novo Item</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2 flex-1" action="/cardapio" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por nome, descricao ou categoria..."
            defaultValue={search}
            className="flex-1 h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        <SortSelect
          options={[
            { value: "sortOrder_asc", label: "Ordem padrao" },
            { value: "name_asc", label: "Nome A-Z" },
            { value: "name_desc", label: "Nome Z-A" },
            { value: "price_asc", label: "Menor preco" },
            { value: "price_desc", label: "Maior preco" },
          ]}
          defaultValue={sort}
        />
      </div>

      {/* Category filter pills */}
      {categoryList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/cardapio">
            <Badge
              variant={categoryFilter === "" ? "default" : "outline"}
              className="cursor-pointer"
            >
              Todas
            </Badge>
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
                <Badge
                  variant={categoryFilter === cat ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {cat}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={UtensilsCrossed}
          title={search ? "Nenhum resultado" : "Nenhum item"}
          description={search ? "Tente ajustar os termos da busca." : "Adicione seu primeiro item ao cardápio."}
          actionLabel="Novo Item"
          actionHref="/cardapio/novo"
        />
      ) : (
        <>
          {/* Uncategorized items first */}
          {uncategorized.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-2 text-muted-foreground">
                Sem Categoria
              </h2>
              <CardapioTable items={uncategorized} />
            </div>
          )}

          {/* Grouped by category */}
          {Object.entries(groupedByCategory).map(([category, catItems]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-2">{category}</h2>
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descricao</TableHead>
            <TableHead>Preco</TableHead>
            <TableHead>Ordem</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead>Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
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
              <TableCell className="max-w-xs truncate text-muted-foreground">
                {item.description || "-"}
              </TableCell>
              <TableCell>{formatCurrency(Number(item.price))}</TableCell>
              <TableCell>{item.sortOrder}</TableCell>
              <TableCell>
                <Badge variant={item.active ? "default" : "secondary"}>
                  {item.active ? "Sim" : "Nao"}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/cardapio/${item.id}`}>
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
  );
}
