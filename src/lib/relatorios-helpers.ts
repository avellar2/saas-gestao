import { getMonthRange, formatMonthLabel, currentMonth } from "./finance-helpers";

export { getMonthRange, formatMonthLabel, currentMonth };

/**
 * Labels para os tipos de relatório.
 */
export const REPORT_LABELS: Record<string, string> = {
  executivo: "Executivo",
  financeiro: "Financeiro",
  os: "Ordens de Serviço",
  cardapio: "Cardápio",
  estoque: "Estoque",
  clientes: "Clientes",
};

/**
 * Obtém o mês de um parâmetro ou o mês atual.
 */
export function getMonthParam(searchParams: URLSearchParams): string {
  return searchParams.get("month") || currentMonth();
}
