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

interface SearchParams {
  search?: string;
  sort?: string;
  lowStock?: string;
  page?: string;
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "inventory");
  if (!hasAccess) redirect("/upgrade?module=inventory");

  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const search = params.search || "";
  const sort = params.sort || "createdAt_desc";
  const lowStock = params.lowStock === "true";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  // Fetch all matching products, then apply lowStock filter in-memory
  // (Prisma does not support comparing two fields in where)
  const allProducts = await tenant.product.findMany({
    where,
    orderBy,
  });

  let filtered = allProducts;
  if (lowStock) {
    filtered = allProducts.filter(
      (p) => Number(p.quantity) <= Number(p.minStock)
    );
  }

  const total = filtered.length;
  const products = filtered.slice(skip, skip + limit);

  const totalPages = Math.ceil(total / limit);

  function isLowStock(quantity: number, minStock: number): boolean {
    return quantity <= minStock;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=products" download>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/estoque/novo">
            <Button>Novo Produto</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2 flex-1" action="/estoque" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por nome, SKU ou categoria..."
            defaultValue={search}
            className="flex-1 h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>

        <Link
          href={lowStock ? "/estoque" : "/estoque?lowStock=true"}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            lowStock
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-transparent border-input hover:bg-muted"
          }`}
        >
          Estoque Baixo
        </Link>

        <SortSelect
          options={[
            { value: "createdAt_desc", label: "Mais recentes" },
            { value: "name_asc", label: "Nome A-Z" },
            { value: "name_desc", label: "Nome Z-A" },
            { value: "quantity_asc", label: "Menor quantidade" },
            { value: "quantity_desc", label: "Maior quantidade" },
            { value: "salePrice_asc", label: "Menor preco" },
            { value: "salePrice_desc", label: "Maior preco" },
          ]}
          defaultValue={sort}
        />
      </div>

      {products.length === 0 ? (
        <EmptyState
          title={search ? "Nenhum resultado" : "Nenhum produto"}
          description={search ? "Tente ajustar os termos da busca." : "Cadastre seu primeiro produto para começar."}
          actionLabel="Novo Produto"
          actionHref="/estoque/novo"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Estoque Min</TableHead>
                  <TableHead>Preço Venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const qtd = Number(product.quantity);
                  const min = Number(product.minStock);
                  const low = isLowStock(qtd, min);

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.sku || "-"}</TableCell>
                      <TableCell>{qtd}</TableCell>
                      <TableCell>{min}</TableCell>
                      <TableCell>
                        {formatCurrency(Number(product.salePrice))}
                      </TableCell>
                      <TableCell>
                        {low ? (
                          <Badge variant="destructive">Estoque Baixo</Badge>
                        ) : (
                          <Badge variant="default">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/estoque/${product.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                  if (lowStock) linkParams.set("lowStock", "true");
                  linkParams.set("page", String(p));
                  return (
                    <Link
                      key={p}
                      href={`/estoque?${linkParams.toString()}`}
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
