import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

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
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar
        user={(session.user || {}) as Record<string, unknown>}
        activeModules={activeModuleKeys}
      />
      <main className="flex-1 overflow-auto ml-64">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
