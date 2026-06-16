import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MenuContent } from "./MenuContent";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { table: tableToken } = await searchParams;

  if (!slug || slug.length < 2) {
    notFound();
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
    },
  });

  if (!company) {
    notFound();
  }

  // Verifica se o módulo menu está ativo
  const companyModule = await prisma.companyModule.findUnique({
    where: {
      companyId_moduleKey: { companyId: company.id, moduleKey: "menu" },
    },
  });

  if (!companyModule?.active) {
    notFound();
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

  // Busca mesa pelo token, se informado
  let tableName: string | null = null;
  if (tableToken) {
    const table = await prisma.restaurantTable.findUnique({
      where: { token: tableToken },
      select: { name: true, active: true },
    });
    if (table?.active) {
      tableName = table.name;
    }
  }

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

  const categories = Object.keys(grouped).map((cat) => ({
    name: cat,
    items: grouped[cat].map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
    })),
  }));

  const uncategorizedItems = uncategorized.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    imageUrl: item.imageUrl,
  }));

  return (
    <MenuContent
      companyName={company.tradeName || company.name}
      companyPhone={company.phone}
      companyWhatsapp={company.whatsapp}
      slug={slug}
      tableToken={tableToken || null}
      tableName={tableName}
      categories={categories}
      uncategorized={uncategorizedItems}
    />
  );
}
