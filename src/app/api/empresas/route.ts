import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateMonthlyPrice } from "@/lib/pricing";
import { MODULE_KEYS, CORE_MODULES } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendCompanyInviteEmail } from "@/lib/email";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          companyModules: { where: { active: true } },
        },
      },
    },
  });

  return NextResponse.json(companies);
}

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
  const {
    name,
    tradeName,
    document,
    phone,
    whatsapp,
    email,
    address,
    status = "TRIAL",
    trialDays = 15,
    adminName,
    adminEmail,
    adminPhone,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Nome da empresa e obrigatorio" }, { status: 400 });
  }

  if (!adminEmail) {
    return NextResponse.json(
      { error: "E-mail do administrador e obrigatorio" },
      { status: 400 }
    );
  }

  if (!adminName) {
    return NextResponse.json(
      { error: "Nome do administrador e obrigatorio" },
      { status: 400 }
    );
  }

  // Normalize admin email
  const normalizedAdminEmail = adminEmail.toLowerCase().trim();

  // Check if admin email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedAdminEmail },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Ja existe um usuario com este e-mail" },
      { status: 409 }
    );
  }

  const trialStartsAt = status === "TRIAL" ? new Date() : null;
  const trialEndsAt =
    status === "TRIAL"
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : null;

  // Generate secure random password hash for the admin
  // The admin will set their own password via the invite link
  const tempPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

  // Generate invite token (expires in 7 days)
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create everything atomically in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Company
    const company = await tx.company.create({
      data: {
        name,
        tradeName: tradeName || null,
        document: document || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        address: address || null,
        status,
        trialStartsAt,
        trialEndsAt,
        monthlyPrice: 49.0,
      },
    });

    // 2. Create CompanyModule entries for all modules (all inactive except core)
    await tx.companyModule.createMany({
      data: MODULE_KEYS.map((moduleKey: ModuleKey) => ({
        companyId: company.id,
        moduleKey,
        active: CORE_MODULES.some((m) => m.key === moduleKey),
        ...(CORE_MODULES.some((m) => m.key === moduleKey)
          ? { activatedAt: new Date() }
          : {}),
      })),
    });

    // 3. Create Subscription
    const coreModuleKeys = CORE_MODULES.map((m) => m.key);
    const subscription = await tx.subscription.create({
      data: {
        companyId: company.id,
        status: status === "TRIAL" ? "TRIAL" : "ACTIVE",
        planName: "Inicial",
        basePrice: 49.0,
        modulesCount: coreModuleKeys.length,
        monthlyPrice: calculateMonthlyPrice(coreModuleKeys),
        trialEndsAt: trialEndsAt,
      },
    });

    // 4. Create first admin User
    const adminUser = await tx.user.create({
      data: {
        name: adminName,
        email: normalizedAdminEmail,
        passwordHash: tempPasswordHash,
        role: "COMPANY_ADMIN",
        companyId: company.id,
        active: true,
      },
    });

    // 5. Create PasswordResetToken (invite token)
    await tx.passwordResetToken.create({
      data: {
        email: normalizedAdminEmail,
        token: inviteToken,
        expiresAt: inviteExpiresAt,
      },
    });

    // 6. Create ActivityLog
    await tx.activityLog.create({
      data: {
        companyId: company.id,
        userId: (session.user as Record<string, unknown>).id as string,
        userName: (session.user as Record<string, unknown>).name as string,
        action: "CREATE",
        entity: "company",
        entityId: company.id,
        details: `Empresa "${name}" criada com administrador ${adminName} (${normalizedAdminEmail})`,
      },
    });

    return { company, subscription, adminUser };
  });

  // Send invite email AFTER the transaction (not fire-and-forget)
  // If email fails, the company and user are still created — the Super Admin gets the fallback link
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${inviteToken}`;
  let emailSent = false;
  let emailError: string | null = null;

  try {
    const emailResult = await sendCompanyInviteEmail(
      normalizedAdminEmail,
      adminName,
      name,
      inviteToken
    );
    emailSent = emailResult.success;
    if (!emailResult.success) {
      emailError = emailResult.error || "Erro desconhecido ao enviar email";
    }
  } catch (err) {
    console.error("Failed to send company invite email:", err);
    emailError = "Erro ao enviar email de convite";
  }

  // Build response — include invite link for Super Admin only if email failed
  const response: Record<string, unknown> = {
    ...result.company,
    adminUser: {
      id: result.adminUser.id,
      name: result.adminUser.name,
      email: result.adminUser.email,
      role: result.adminUser.role,
    },
  };

  // Only include invite link in the response for the Super Admin
  // Never log the token in production
  if (!emailSent) {
    response.inviteLink = inviteUrl;
    response.inviteExpiresAt = inviteExpiresAt.toISOString();
    response.emailWarning = emailError || "Email nao enviado. Compartilhe o link abaixo com o administrador.";
  }

  return NextResponse.json(response, { status: 201 });
}