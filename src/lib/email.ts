import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Gestor Local";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@resend.dev";

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

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
