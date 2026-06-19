import { isCoreModule, getModuleConfig } from "./modules";

export const BASE_PRICE = 49; // núcleo (Clientes) + 1 módulo incluso

/**
 * Calcula o preço mensal com base nos módulos ativos.
 * O primeiro módulo não-core está incluso no plano base (R$49).
 * Módulos core são grátis. Módulos legacy não são cobrados.
 *
 * Cada módulo extra é cobrado pelo seu preço individual definido em modules.ts.
 * O preço do plano base (R$49) inclui 1 módulo à escolha.
 * Módulos adicionais são cobrados individualmente conforme o Price ID no Stripe.
 */
export function calculateMonthlyPrice(activeModuleKeys: string[]): number {
  // Filtrar módulos core (são grátis) e legacy (não cobrar)
  const purchasable = activeModuleKeys.filter(
    (k) => !isCoreModule(k) && getModuleConfig(k)?.status !== "legacy"
  );

  if (purchasable.length === 0) return BASE_PRICE;

  // Ordenar por preço descendente — o módulo mais caro fica incluso no plano base
  const sortedPrices = purchasable
    .map((k) => getModuleConfig(k)?.monthlyPrice ?? 20)
    .sort((a, b) => b - a);

  // Primeiro módulo incluso no plano base
  let total = BASE_PRICE;
  for (let i = 1; i < sortedPrices.length; i++) {
    total += sortedPrices[i];
  }
  return total;
}

/**
 * Retorna o nome do plano baseado nos módulos ativos.
 */
export function getPlanName(activeModuleKeys: string[]): string {
  const purchasable = activeModuleKeys.filter((k) => !isCoreModule(k));
  const count = purchasable.length;

  if (count <= 0) return "Inicial";
  if (count === 1) return "Inicial";
  if (count === 2) return "Crescimento";
  if (count === 3) return "Profissional";
  return "Completo";
}

export const PLAN_LABELS = [
  { name: "Inicial", modules: 1, price: 49 },
  { name: "Crescimento", modules: 2, price: 79 },
  { name: "Profissional", modules: 3, price: 104 },
  { name: "Completo", modules: 5, price: 144 },
];