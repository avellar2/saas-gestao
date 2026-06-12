export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function quoteWhatsAppMessage(
  customerName: string,
  quoteNumber: number,
  total: number,
  companyName: string
): string {
  return `Olá ${customerName}! Segue orçamento #${quoteNumber} da ${companyName} no valor de R$${total.toFixed(2)}.`;
}

export function serviceOrderFinishedMessage(
  customerName: string,
  soNumber: number,
  total: number,
  companyName: string
): string {
  return `Olá ${customerName}! Sua OS #${soNumber} da ${companyName} foi finalizada. Valor: R$${total.toFixed(2)}.`;
}

export function serviceOrderDeliveredMessage(
  customerName: string,
  soNumber: number,
  companyName: string
): string {
  return `Olá ${customerName}! Sua OS #${soNumber} da ${companyName} foi marcada como entregue. Obrigado!`;
}