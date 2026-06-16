import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeServiceOrderForPortal } from "@/lib/portal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const serviceOrder = await prisma.serviceOrder.findUnique({
    where: { publicToken: token },
    include: {
      company: {
        select: {
          name: true,
          tradeName: true,
          phone: true,
          whatsapp: true,
          email: true,
        },
      },
      customer: { select: { name: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!serviceOrder) {
    return NextResponse.json(
      { error: "Ordem de serviço não encontrada" },
      { status: 404 }
    );
  }

  const safeData = sanitizeServiceOrderForPortal(serviceOrder);
  return NextResponse.json(safeData);
}