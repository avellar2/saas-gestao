import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const modules = await prisma.module.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(modules);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, description, basePrice, active, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do modulo e obrigatorio" }, { status: 400 });
    }

    const existing = await prisma.module.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Modulo nao encontrado" }, { status: 404 });
    }

    const updated = await prisma.module.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(active !== undefined && { active }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder, 10) }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar modulo" }, { status: 500 });
  }
}