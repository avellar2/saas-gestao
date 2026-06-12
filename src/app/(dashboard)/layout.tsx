import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MODULE_ROUTES } from "@/types";
import type { ModuleKey } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as Record<string, unknown>).role;

  if (role === "SUPER_ADMIN") {
    redirect("/admin");
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const activeModules = await prisma.companyModule.findMany({
    where: { companyId, active: true },
    select: { moduleKey: true },
  });

  const activeModuleKeys = new Set(activeModules.map((m) => m.moduleKey));

  const moduleNavItems: { key: string; label: string; href: string }[] = [];

  for (const [key, href] of Object.entries(MODULE_ROUTES)) {
    const labelMap: Record<string, string> = {
      customers: "Clientes",
      quotes: "Orçamentos",
      service_orders: "Ordens de Serviço",
    };
    moduleNavItems.push({
      key,
      label: labelMap[key] || key,
      href,
    });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">Gestor Local</h1>
          <p className="text-sm text-gray-400 mt-1">Painel da Empresa</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/dashboard"
            className="block px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Início
          </Link>
          {moduleNavItems
            .filter((item) => activeModuleKeys.has(item.key))
            .map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="block px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 truncate">
            {session.user?.email}
          </p>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}