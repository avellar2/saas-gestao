import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendCompanyInviteEmail } from "@/lib/email";

/**
 * POST /api/empresas/invite
 *
 * Generates an invite link for an existing user to set their password.
 * Only accessible by SUPER_ADMIN.
 * Invalidates any previous unused tokens for the user's email.
 * The token expires in 7 days.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, companyId } = body;

  if (!userId || !companyId) {
    return NextResponse.json(
      { error: "userId e companyId sao obrigatorios" },
      { status: 400 }
    );
  }

  // Verify the user exists and belongs to the company
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Usuario nao encontrado" },
      { status: 404 }
    );
  }

  if (user.companyId !== companyId) {
    return NextResponse.json(
      { error: "Usuario nao pertence a esta empresa" },
      { status: 403 }
    );
  }

  // Verify the company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    return NextResponse.json(
      { error: "Empresa nao encontrada" },
      { status: 404 }
    );
  }

  // Invalidate any existing unused tokens for this email
  await prisma.passwordResetToken.updateMany({
    where: {
      email: user.email,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  // Generate a new invite token (expires in 7 days)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      email: user.email,
      token,
      expiresAt,
    },
  });

  // Try to send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${appUrl}/reset-password?token=${token}`;

  let emailSent = false;
  let emailError: string | null = null;

  try {
    const emailResult = await sendCompanyInviteEmail(
      user.email,
      user.name,
      company.name,
      token
    );
    emailSent = emailResult.success;
    if (!emailResult.success) {
      emailError = emailResult.error || "Erro ao enviar email";
    }
  } catch (err) {
    console.error("Failed to send invite email:", err);
    emailError = "Erro ao enviar email";
  }

  const response: Record<string, unknown> = {};

  // Always return the invite link for Super Admin
  // If email was sent successfully, still provide the link as backup
  response.inviteLink = inviteLink;
  response.inviteExpiresAt = expiresAt.toISOString();
  response.emailSent = emailSent;

  if (!emailSent) {
    response.emailWarning = emailError || "Email nao enviado. Compartilhe o link com o administrador.";
  }

  return NextResponse.json(response);
}