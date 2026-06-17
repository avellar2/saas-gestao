import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

interface SearchParams {
  search?: string;
  page?: string;
}

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: "Administrador",
  STAFF: "Colaborador",
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "users_permissions");
  if (!hasAccess) redirect("/upgrade?module=users_permissions");

  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    tenant.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    }),
    tenant.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Usuários</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">{total} {total === 1 ? "usuário" : "usuários"}</p>
        </div>
        <Link href="/usuarios/novo">
          <Button size="sm" className="gap-2 h-9 px-3.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white transition-all duration-150 active:scale-[0.97]">
            Novo Usuário
          </Button>
        </Link>
      </div>

      <form className="flex gap-2 flex-1" action="/usuarios" method="GET">
        <input
          name="search"
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          defaultValue={search}
          className="flex-1 h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 placeholder:text-muted-foreground/60"
        />
        <Button type="submit" variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
          Buscar
        </Button>
      </form>

      {users.length === 0 ? (
        <EmptyState icon="Users"
          title={search ? "Nenhum resultado" : "Nenhum usuário"}
          description={search ? "Tente ajustar os termos da busca." : "Cadastre seu primeiro usuário para começar."}
          actionLabel="Novo Usuário"
          actionHref="/usuarios/novo"
        />
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
                    <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Nome</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">E-mail</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Função</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Criado em</TableHead>
                    <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="group border-b border-border/30 transition-colors duration-150 hover:bg-slate-50/30 last:border-b-0">
                      <TableCell className="py-3.5 pl-5 pr-3 text-sm font-medium text-foreground">{user.name}</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="py-3.5 px-3 text-sm">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 px-3 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${user.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                          {user.active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="py-3.5 pl-3 pr-5 text-right">
                        <Link href={`/usuarios/${user.id}`}>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150">
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
                (p) => (
                  <Link
                    key={p}
                    href={`/usuarios?search=${encodeURIComponent(search)}&page=${p}`}
                  >
                    <span className={`inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer select-none ${
                      p === page
                        ? "bg-slate-600 border-slate-600 text-white"
                        : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                    }`}>
                      {p}
                    </span>
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
