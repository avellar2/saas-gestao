const BASE_PRICE = 49.0;
const MODULE_PRICES = [50, 30, 25];
const ADDITIONAL_PRICE = 20;

export function calculateMonthlyPrice(activeModulesCount: number): number {
  if (activeModulesCount === 0) return BASE_PRICE;
  let total = BASE_PRICE;
  for (let i = 0; i < activeModulesCount; i++) {
    if (i < MODULE_PRICES.length) {
      total += MODULE_PRICES[i];
    } else {
      total += ADDITIONAL_PRICE;
    }
  }
  return total;
}

export function getPlanName(modulesCount: number): string {
  if (modulesCount <= 1) return "Inicial";
  if (modulesCount === 2) return "Crescimento";
  if (modulesCount === 3) return "Profissional";
  return "Completo";
}

export const PLAN_LABELS: Record<string, { modules: number; price: number }> = {
  Inicial: { modules: 1, price: 99 },
  Crescimento: { modules: 2, price: 129 },
  Profissional: { modules: 3, price: 154 },
  Completo: { modules: 5, price: 194 },
};