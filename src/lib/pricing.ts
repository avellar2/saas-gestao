import { isCoreModule, getModuleConfig } from "./modules";

export const BASE_PRICE = 49; // núcleo (Clientes) + 1 módulo incluso

const EXTRA_MODULE_PRICES = [30, 25, 20]; // 2º, 3º, 4º módulo extra
const ADDITIONAL_MODULE_PRICE = 20; // a partir do 5º módulo extra

/**
 * Calcula o preço mensal com base nos módulos ativos.
 * O primeiro módulo não-core está incluso no plano base (R$49).
 * Módulos core são grátis. Módulos legacy não são cobrados.
 */
export function calculateMonthlyPrice(activeModuleKeys: string[]): number {
  // Filtrar módulos core (são grátis) e legacy (não cobrar)
  const purchasable = activeModuleKeys.filter(
    (k) => !isCoreModule(k) && getModuleConfig(k)?.status !== "legacy"
  );

  if (purchasable.length === 0) return BASE_PRICE;

  // Ordenar por preço descendente para cobrar os mais caros primeiro
  const sortedPrices = purchasable
    .map((k) => getModuleConfig(k)?.monthlyPrice ?? 20)
    .sort((a, b) => b - a);

  // Primeiro módulo incluso no plano base
  let total = BASE_PRICE;
  for (let i = 1; i < sortedPrices.length; i++) {
    const priceIndex = i - 1;
    if (priceIndex < EXTRA_MODULE_PRICES.length) {
      total += EXTRA_MODULE_PRICES[priceIndex];
    } else {
      total += ADDITIONAL_MODULE_PRICE;
    }
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