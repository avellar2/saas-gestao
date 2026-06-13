import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <DashboardSidebar
        user={(session.user || {}) as Record<string, unknown>}
        activeModules={activeModuleKeys}
      />
      <div className="flex-1 flex flex-col ml-0 lg:ml-64">
        {/* Header mobile + theme toggle */}
        <header className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
          <span className="font-semibold text-sm tracking-tight">Gestor Local</span>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-5 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
