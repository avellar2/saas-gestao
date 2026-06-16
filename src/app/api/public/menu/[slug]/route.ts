import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length < 2) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  // Busca empresa pelo slug
  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      tradeName: true,
      phone: true,
      whatsapp: true,
      email: true,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  // Verifica se o módulo menu está ativo para esta empresa
  const companyModule = await prisma.companyModule.findUnique({
    where: {
      companyId_moduleKey: { companyId: company.id, moduleKey: "menu" },
    },
  });

  if (!companyModule?.active) {
    return NextResponse.json({ error: "Cardápio não disponível" }, { status: 404 });
  }

  // Busca itens ativos do cardápio
  const items = await prisma.menuItem.findMany({
    where: {
      companyId: company.id,
      active: true,
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      category: true,
      imageUrl: true,
    },
  });

  // Agrupa por categoria
  const grouped: Record<string, typeof items> = {};
  const uncategorized: typeof items = [];

  for (const item of items) {
    const cat = item.category || "__uncategorized__";
    if (cat === "__uncategorized__") {
      uncategorized.push(item);
    } else {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
  }

  return NextResponse.json({
    company: {
      name: company.tradeName || company.name,
      phone: company.phone,
      whatsapp: company.whatsapp,
      email: company.email,
    },
    categories: Object.keys(grouped).map((cat) => ({
      name: cat,
      items: grouped[cat].map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.imageUrl,
      })),
    })),
    uncategorized: uncategorized.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
    })),
  });
}
