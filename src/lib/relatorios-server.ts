import { isModuleActive } from "./module-guard";

/**
 * Verifica se um módulo de relatório está ativo.
 * Relatórios específicos exigem o módulo correspondente.
 * "clientes" é core e sempre ativo.
 *
 * Este arquivo é server-only (importa module-guard que depende de prisma).
 */
export async function checkReportModuleAccess(
  companyId: string,
  moduleKey: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (moduleKey === "customers") return { allowed: true };

  const active = await isModuleActive(companyId, moduleKey);
  if (!active) {
    return { allowed: false, reason: `Módulo ${moduleKey} não está ativo` };
  }
  return { allowed: true };
}

/**
 * Mapeia tipo de relatório para moduleKey.
 */
export const REPORT_MODULE_MAP: Record<string, string> = {
  executivo: "reports",
  financeiro: "finance",
  os: "service_orders",
  cardapio: "menu",
  estoque: "inventory",
  clientes: "customers",
};
