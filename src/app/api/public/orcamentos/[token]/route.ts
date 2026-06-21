import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeQuoteForPortal } from "@/lib/quote-portal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Token invalido" }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({
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

  if (!quote) {
    return NextResponse.json(
      { error: "Orcamento nao encontrado" },
      { status: 404 }
    );
  }

  const safeData = sanitizeQuoteForPortal(quote);
  return NextResponse.json(safeData);
}
