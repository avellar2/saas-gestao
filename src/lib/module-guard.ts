import { prisma } from "./prisma";
import type { ModuleKey } from "@/types";

const MODULE_ROUTE_MAP: Record<string, ModuleKey> = {
  "/clientes": "customers",
  "/orcamentos": "quotes",
  "/ordens-servico": "service_orders",
};

export function getModuleKeyForPath(pathname: string): ModuleKey | null {
  const prefix = Object.keys(MODULE_ROUTE_MAP).find((key) =>
    pathname.startsWith(key)
  );
  return prefix ? MODULE_ROUTE_MAP[prefix] : null;
}

export async function isModuleActive(
  companyId: string,
  moduleKey: ModuleKey
): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: {
      companyId_moduleKey: { companyId, moduleKey },
    },
  });
  return companyModule?.active ?? false;
}

export async function getActiveModules(companyId: string): Promise<string[]> {
  const modules = await prisma.companyModule.findMany({
    where: { companyId, active: true },
    select: { moduleKey: true },
  });
  return modules.map((m) => m.moduleKey);
}