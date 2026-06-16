/**
 * Paleta central de cores para gráficos (recharts).
 *
 * Centraliza as cores que estavam espalhadas como `PIE_COLORS` locais e fills
 * hardcoded em cada tela de gráfico (Financeiro, Estoque, Relatórios, OS, etc.).
 *
 * Uso previsto: Etapa 13A (Camada 3 — telas autenticadas). Aqui a paleta fica
 * pronta para substituir as definições locais de forma visual-neutra.
 *
 * Cores em hex absoluto (funcionam em light e dark), alinhadas ao que já está
 * em produção — a migração não muda o visual, apenas unifica a fonte.
 */

/** Cores de séries nomeadas (barras/linhas). */
export const CHART_SERIES = {
  receita: "#10b981", // emerald-500
  despesa: "#ef4444", // red-500
  saldo: "#3b82f6", // blue-500
  entradas: "#10b981", // emerald-500
  saidas: "#ef4444", // red-500
  pedidos: "#f59e0b", // amber-500
  os: "#8b5cf6", // violet-500
  alerta: "#f59e0b", // amber-500
} as const;

export type ChartSeriesKey = keyof typeof CHART_SERIES;

/**
 * Paleta de categorias para gráficos de pizza (PIE).
 * Ordenada a partir do emerald (cor de marca). Cobre até 9 fatias.
 */
export const PIE_COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ef4444", // red-500
  "#14b8a6", // teal-500
  "#ec4899", // pink-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
] as const;

/** Alias semântico: distribuição por origem reusa a paleta de categorias. */
export const ORIGEM_COLORS = PIE_COLORS;

/** Categoria por origem — mapa explícito para quando houver label fixo. */
export const ORIGIN_COLORS: Record<string, string> = {
  os: "#8b5cf6",
  cardapio: "#10b981",
  orcamento: "#3b82f6",
  estoque: "#f59e0b",
  manual: "#6366f1",
};

/** Retorna a cor de categoria pelo índice (com wrap-around). */
export function getPieColor(index: number): string {
  return PIE_COLORS[index % PIE_COLORS.length];
}

/** Raio padrão de cantos das barras (top) — igual ao já usado nas telas. */
export const BAR_RADIUS_TOP: [number, number, number, number] = [4, 4, 0, 0];
export const BAR_RADIUS_RIGHT: [number, number, number, number] = [0, 4, 4, 0];