import { prisma } from "./prisma";
import { MODULE_ROUTE_MAP, CORE_MODULES, isCoreModule } from "./modules";

export function getModuleKeyForPath(pathname: string): string | null {
  for (const [prefix, moduleKey] of MODULE_ROUTE_MAP) {
    if (pathname.startsWith(prefix)) {
      return moduleKey;
    }
  }
  return null;
}

export async function isModuleActive(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  // Módulos core são sempre ativos
  if (isCoreModule(moduleKey)) return true;

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
  const activeKeys = modules.map((m) => m.moduleKey);

  // Garantir que módulos core sempre estejam presentes
  for (const core of CORE_MODULES) {
    if (!activeKeys.includes(core.key)) {
      activeKeys.push(core.key);
    }
  }

  return activeKeys;
}