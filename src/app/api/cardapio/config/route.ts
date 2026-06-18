import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { menuConfigSchema } from "@/lib/validations";
import { findMenuItemInCompany, notFoundResponse } from "@/lib/tenant-guard";

async function checkModuleAccess(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true, name: true, tradeName: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    slug: company.slug,
    name: company.tradeName || company.name,
    publicUrl: company.slug ? `/c/${company.slug}` : null,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = menuConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Slug inválido", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const slug = parsed.data.slug;

  // BUG-033 fix: validar formato do slug (minúsculo, sem espaço, sem acento, só letras/números/hífen)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "O slug deve conter apenas letras minúsculas, números e hífen (sem espaços ou acentos)" },
      { status: 400 }
    );
  }
  if (slug.length < 3 || slug.length > 50) {
    return NextResponse.json(
      { error: "O slug deve ter entre 3 e 50 caracteres" },
      { status: 400 }
    );
  }

  // Verifica se slug já está em uso por outra empresa
  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing && existing.id !== companyId) {
    return NextResponse.json(
      { error: "Este slug já está em uso por outra empresa" },
      { status: 409 }
    );
  }

  const tenant = tenantPrisma(companyId);

  // Atualiza slug diretamente no banco (Company não está em TENANT_MODELS para update)
  await prisma.company.update({
    where: { id: companyId },
    data: { slug },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "menu",
    entityId: undefined,
    details: `Slug: ${slug}`,
  });

  return NextResponse.json({
    slug,
    publicUrl: `/c/${slug}`,
  });
}
