// ── Phone normalization ─────────────────────────────────────────────

/**
 * Normaliza telefone brasileiro para formato wa.me.
 * - Remove caracteres não numéricos
 * - 10 ou 11 dígitos: adiciona DDI 55
 * - Já com 55 e tamanho válido (12-13): mantém
 * - Inválido: retorna null
 */
export function normalizeBrazilianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  // Already has DDI 55 and correct length (12-13 digits)
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) {
    return digits;
  }

  // 10 or 11 digits (without DDI) — add 55
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }

  // Invalid
  return null;
}

// ── WhatsApp link builder ───────────────────────────────────────────

export function buildWhatsAppLink(phone: string, message: string): string | null {
  const normalized = normalizeBrazilianPhone(phone);
  if (!normalized) return null;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encodedMessage}`;
}

// ── Messages ────────────────────────────────────────────────────────

export function quoteWhatsAppMessage(
  customerName: string,
  quoteNumber: number,
  total: number,
  companyName: string,
  validUntil: Date | null,
  portalUrl: string
): string {
  const formattedTotal = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const validUntilStr = validUntil
    ? ` válido até ${validUntil.toLocaleDateString("pt-BR")}`
    : "";

  return `Olá ${customerName}! Segue o orçamento nº ${quoteNumber} da ${companyName}, no valor de ${formattedTotal}${validUntilStr}. Visualize, baixe e aprove pelo link: ${portalUrl}`;
}

export function serviceOrderFinishedMessage(
  customerName: string,
  soNumber: number,
  total: number,
  companyName: string
): string {
  return `Olá ${customerName}! Sua OS #${soNumber} da ${companyName} foi finalizada. Valor: R$${total.toFixed(2)}.`;
}

export function serviceOrderCreatedMessage(
  customerName: string,
  soNumber: number,
  companyName: string,
  portalUrl: string
): string {
  return `Olá ${customerName}! Sua Ordem de Serviço nº ${soNumber} foi aberta na ${companyName}. Acompanhe o andamento pelo portal: ${portalUrl}`;
}

export function serviceOrderStatusMessage(
  customerName: string,
  soNumber: number,
  statusLabel: string,
  companyName: string,
  portalUrl: string
): string {
  return `Olá ${customerName}! Sua OS nº ${soNumber} da ${companyName} está em "${statusLabel}". Acompanhe pelo portal: ${portalUrl}`;
}

export function serviceOrderDeliveredMessage(
  customerName: string,
  soNumber: number,
  companyName: string
): string {
  return `Olá ${customerName}! Sua OS #${soNumber} da ${companyName} foi marcada como entregue. Obrigado!`;
}

export function portalWhatsAppMessage(
  customerName: string,
  osCode: string,
  companyName: string
): string {
  return `Olá! Sou ${customerName}, estou acompanhando a OS ${osCode} pelo portal e gostaria de mais informações.`;
}
