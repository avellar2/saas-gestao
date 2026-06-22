import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Gestor Local";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@resend.dev";

export async function sendTrialExpiringEmail(
  email: string,
  companyName: string,
  daysLeft: number
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
        .highlight { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0; }
        .highlight strong { font-size: 24px; color: #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="body">
          <p>Olá <strong>${companyName}</strong>,</p>
          <p>Seu período de teste gratuito está próximo do fim.</p>
          <div class="highlight">
            <p style="margin: 0 0 4px; color: #92400e;">Seu trial expira em</p>
            <strong>${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}</strong>
          </div>
          <p>Para continuar usando todos os recursos do ${appName}, faça o upgrade do seu plano.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}/upgrade" class="btn">Fazer Upgrade</a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Se você já realizou o upgrade, ignore este email.</p>
        </div>
        <div class="footer">
          <p>${appName} &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!resend) {
    console.log(`\n[DEV] Trial expiring email for ${companyName} (${email}): ${daysLeft} days left\n`);
    return { success: true };
  }

  try {
    if (!resend) throw new Error("Resend not configured");
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Seu trial expira em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} - ${appName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send trial expiring email:", error);
    return { success: false, error: "Erro ao enviar email de trial expirando" };
  }
}

export async function sendBudgetApprovedEmail(
  email: string,
  customerName: string,
  quoteNumber: string,
  quoteTotal: number
): Promise<{ success: boolean; error?: string }> {
  const formattedTotal = quoteTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
        .value { font-size: 28px; font-weight: 700; color: #16a34a; text-align: center; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="body">
          <p>Olá <strong>${customerName}</strong>,</p>
          <p>Seu orçamento <strong>Nº ${quoteNumber}</strong> foi aprovado!</p>
          <div class="value">${formattedTotal}</div>
          <p>Em breve entraremos em contato para dar continuidade ao serviço.</p>
          <p style="font-size: 14px; color: #6b7280;">Caso tenha dúvidas, responda a este email ou entre em contato conosco.</p>
        </div>
        <div class="footer">
          <p>${appName} &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!resend) {
    console.log(`\n[DEV] Budget approved email for ${customerName} (${email}): Nº ${quoteNumber} - ${formattedTotal}\n`);
    return { success: true };
  }

  try {
    if (!resend) throw new Error("Resend not configured");
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Orcamento Nº ${quoteNumber} aprovado - ${appName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send budget approved email:", error);
    return { success: false, error: "Erro ao enviar email de orcamento aprovado" };
  }
}

export async function sendOSCompletedEmail(
  email: string,
  customerName: string,
  osNumber: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
        .check { text-align: center; font-size: 48px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="body">
          <div class="check">&#10003;</div>
          <p>Olá <strong>${customerName}</strong>,</p>
          <p>Sua Ordem de Servico <strong>Nº ${osNumber}</strong> foi concluida!</p>
          <p>O servico ja esta disponivel para retirada/entrega.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}/ordens-servico" class="btn">Ver Detalhes</a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Agradecemos pela preferencia!</p>
        </div>
        <div class="footer">
          <p>${appName} &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!resend) {
    console.log(`\n[DEV] OS completed email for ${customerName} (${email}): Nº ${osNumber}\n`);
    return { success: true };
  }

  try {
    if (!resend) throw new Error("Resend not configured");
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `OS Nº ${osNumber} concluida - ${appName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send OS completed email:", error);
    return { success: false, error: "Erro ao enviar email de OS concluida" };
  }
}

export async function sendOSCreatedEmail(
  email: string,
  customerName: string,
  osNumber: number,
  companyName: string,
  portalUrl: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="body">
          <p>Olá <strong>${customerName}</strong>,</p>
          <p>Sua Ordem de Serviço <strong>Nº ${osNumber}</strong> foi aberta na <strong>${companyName}</strong>!</p>
          <p>Em breve entraremos em contato para dar continuidade ao serviço.</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" class="btn">Acompanhar OS</a>
          </p>
          <p style="font-size: 14px; color: #6b7280;">Caso tenha dúvidas, responda a este email ou entre em contato conosco.</p>
        </div>
        <div class="footer">
          <p>${appName} &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (process.env.NODE_ENV === "development") {
    console.log(`\n[DEV] OS created email for ${customerName} (${email}): Nº ${osNumber}\n`);
    return { success: true };
  }

  try {
    if (!resend) throw new Error("Resend not configured");
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `OS Nº ${osNumber} aberta - ${appName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send OS created email:", error);
    return { success: false, error: "Erro ao enviar email de OS criada" };
  }
}

export async function sendOSStatusEmail(
  email: string,
  customerName: string,
  osNumber: number,
  statusLabel: string,
  companyName: string,
  portalUrl: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
        .status { text-align: center; font-size: 18px; font-weight: 700; color: #3b82f6; margin: 16px 0; padding: 12px; background: #eff6ff; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="body">
          <p>Olá <strong>${customerName}</strong>,</p>
          <p>Sua Ordem de Serviço <strong>Nº ${osNumber}</strong> na <strong>${companyName}</strong> teve uma atualização:</p>
          <div class="status">${statusLabel}</div>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" class="btn">Acompanhar OS</a>
          </p>
          <p style="font-size: 14px; color: #6b7280;">Caso tenha dúvidas, responda a este email ou entre em contato conosco.</p>
        </div>
        <div class="footer">
          <p>${appName} &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (process.env.NODE_ENV === "development") {
    console.log(`\n[DEV] OS status email for ${customerName} (${email}): Nº ${osNumber} - ${statusLabel}\n`);
    return { success: true };
  }

  try {
    if (!resend) throw new Error("Resend not configured");
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `OS Nº ${osNumber} - ${statusLabel} - ${appName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send OS status email:", error);
    return { success: false, error: "Erro ao enviar email de atualizacao de OS" };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
        .token { background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 14px; text-align: center; margin: 16px 0; color: #374151; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="body">
          <p>Recebemos uma solicitação de redefinição de senha para sua conta.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" class="btn">Redefinir Senha</a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Se o botão não funcionar, copie o link abaixo no seu navegador:</p>
          <div class="token">${resetUrl}</div>
          <p style="font-size: 14px; color: #6b7280;">Este link expira em 1 hora. Se você não solicitou esta redefinição, ignore este email.</p>
        </div>
        <div class="footer">
          <p>${appName} &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!resend) {
    // Dev mode: log the token instead of sending email
    console.log(`\n[DEV] Password reset token for ${email}: ${token}`);
    console.log(`[DEV] Reset URL: ${resetUrl}\n`);
    return { success: true };
  }

  try {
    if (!resend) throw new Error("Resend not configured");
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Redefina sua senha - ${appName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error: "Erro ao enviar email. Tente novamente mais tarde." };
  }
}

/**
 * Email de convite para novo administrador de empresa.
 * Enviado quando o Super Admin cria uma empresa com responsável.
 * Contém link para definição de senha.
 */
export async function sendCompanyInviteEmail(
  email: string,
  adminName: string,
  companyName: string,
  token: string
): Promise<{ success: boolean; error?: string; inviteUrl?: string }> {
  const inviteUrl = `${appUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
        .token { background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 14px; text-align: center; margin: 16px 0; color: #374151; word-break: break-all; }
        .company-name { font-weight: 600; color: #6366f1; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="body">
          <p>Olá <strong>${adminName}</strong>,</p>
          <p>Você foi adicionado(a) como administrador da empresa <span class="company-name">${companyName}</span> no ${appName}.</p>
          <p>Para acessar sua conta, defina sua senha no link abaixo:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${inviteUrl}" class="btn">Definir Minha Senha</a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Se o botão não funcionar, copie o link abaixo no seu navegador:</p>
          <div class="token">${inviteUrl}</div>
          <p style="font-size: 14px; color: #6b7280;">Este link expira em 7 dias. Após esse prazo, solicite uma nova redefinição de senha.</p>
          <p style="font-size: 14px; color: #6b7280;">Se você não espera receber este email, ignore-o.</p>
        </div>
        <div class="footer">
          <p>${appName} &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!resend) {
    // Dev mode: log the invite info instead of sending email
    console.log(`\n[DEV] Company invite for ${adminName} (${email}) - Company: ${companyName}`);
    console.log(`[DEV] Invite URL: ${inviteUrl}\n`);
    return { success: true, inviteUrl };
  }

  try {
    if (!resend) throw new Error("Resend not configured");
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Convite: Acesse o ${appName} como administrador de ${companyName}`,
      html,
    });
    return { success: true, inviteUrl };
  } catch (error) {
    console.error("Failed to send company invite email:", error);
    return { success: false, error: "Erro ao enviar email de convite", inviteUrl };
  }
}

/**
 * Email de envio de orçamento para o cliente.
 * Contém link para o portal público onde o cliente pode visualizar e aprovar.
 */
export async function sendQuoteEmail(
  email: string,
  customerName: string,
  quoteNumber: number,
  companyName: string,
  total: number,
  description: string | null,
  validUntil: Date | null,
  portalUrl: string
): Promise<{ success: boolean; error?: string }> {
  const formattedTotal = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const validUntilStr = validUntil ? validUntil.toLocaleDateString("pt-BR") : "Não definida";
  const pdfUrl = portalUrl.replace("/portal/orcamento/", "/api/public/orcamentos/") + "/pdf";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .btn-secondary { display: inline-block; background: #f3f4f6; color: #374151; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin-top: 8px; }
        .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
        .value { font-size: 28px; font-weight: 700; color: #6366f1; text-align: center; margin: 16px 0; }
        .meta { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .meta-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
        .meta-label { color: #6b7280; }
        .meta-value { color: #111827; font-weight: 500; }
        .description { background: #f0f9ff; border-left: 3px solid #6366f1; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #374151; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="body">
          <p>Olá <strong>${customerName}</strong>,</p>
          <p>Segue o orçamento <strong>Nº ${String(quoteNumber).padStart(4, "0")}</strong> da <strong>${companyName}</strong>.</p>

          <div class="value">${formattedTotal}</div>

          ${description ? `<div class="description">${description}</div>` : ""}

          <div class="meta">
            <div class="meta-row">
              <span class="meta-label">Número:</span>
              <span class="meta-value">#${String(quoteNumber).padStart(4, "0")}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Validade:</span>
              <span class="meta-value">${validUntilStr}</span>
            </div>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" class="btn">Visualizar e Aprovar Orçamento</a>
          </div>

          <div style="text-align: center; margin: 16px 0;">
            <a href="${pdfUrl}" class="btn-secondary">Baixar PDF</a>
          </div>

          <p style="font-size: 14px; color: #6b7280;">Caso tenha dúvidas, responda a este email ou entre em contato conosco.</p>
        </div>
        <div class="footer">
          <p>${appName} &mdash; Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!resend) {
    console.log(`\n[DEV] Quote email for ${customerName} (${email}): Nº ${quoteNumber} - ${formattedTotal}\n`);
    console.log(`[DEV] Portal URL: ${portalUrl}\n`);
    return { success: true };
  }

  try {
    if (!resend) throw new Error("Resend not configured");
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Orçamento #${String(quoteNumber).padStart(4, "0")} - ${companyName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send quote email:", error);
    return { success: false, error: "Erro ao enviar email do orçamento" };
  }
}