import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const modules = await prisma.module.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(modules);
}