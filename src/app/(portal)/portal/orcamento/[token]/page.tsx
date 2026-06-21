import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sanitizeQuoteForPortal } from "@/lib/quote-portal";
import { PortalQuoteContent } from "./PortalQuoteContent";
import { PortalQuoteError } from "./PortalQuoteError";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    select: {
      number: true,
      company: { select: { name: true, tradeName: true } },
    },
  });

  if (!quote) {
    return { title: "Orcamento — AVGESTAO" };
  }

  const companyName = quote.company.tradeName ?? quote.company.name;

  return {
    title: `Orcamento #${String(quote.number).padStart(4, "0")} — ${companyName}`,
    description: `Visualize e aprove o orcamento #${String(quote.number).padStart(4, "0")} da ${companyName}.`,
  };
}

export default async function PortalQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return <PortalQuoteError type="invalid_token" />;
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
    return <PortalQuoteError type="not_found" />;
  }

  const safeData = sanitizeQuoteForPortal(quote);
  return <PortalQuoteContent data={safeData} />;
}
