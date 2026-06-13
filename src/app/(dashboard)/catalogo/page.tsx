import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
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
import { ShoppingBag } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catalogo WhatsApp</h1>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=catalog" download>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/catalogo/novo">
            <Button>Novo Item</Button>
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
            className="flex-1 h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        <SortSelect
          options={[
            { value: "createdAt_desc", label: "Mais recentes" },
            { value: "name_asc", label: "Nome A-Z" },
            { value: "name_desc", label: "Nome Z-A" },
            { value: "price_asc", label: "Menor preco" },
            { value: "price_desc", label: "Maior preco" },
          ]}
          defaultValue={sort}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ShoppingBag}
          title={search ? "Nenhum resultado" : "Nenhum item"}
          description={search ? "Tente ajustar os termos da busca." : "Cadastre seu primeiro item do catálogo."}
          actionLabel="Novo Item"
          actionHref="/catalogo/novo"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preco</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>
                      {formatCurrency(Number(item.price))}
                    </TableCell>
                    <TableCell>
                      {item.active ? (
                        <Badge variant="default">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/catalogo/${item.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `${item.name} - ${formatCurrency(Number(item.price))}${item.description ? `\n\n${item.description}` : ""}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            WhatsApp
                          </Button>
                        </a>
                      </div>
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
                  if (sort !== "createdAt_desc") linkParams.set("sort", sort);
                  linkParams.set("page", String(p));
                  return (
                    <Link
                      key={p}
                      href={`/catalogo?${linkParams.toString()}`}
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
