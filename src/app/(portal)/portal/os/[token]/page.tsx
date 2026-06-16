import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sanitizeServiceOrderForPortal } from "@/lib/portal";
import { PortalOSContent } from "./PortalOSContent";
import { PortalOSError } from "./PortalOSError";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  const serviceOrder = await prisma.serviceOrder.findUnique({
    where: { publicToken: token },
    select: {
      code: true,
      number: true,
      company: { select: { name: true, tradeName: true } },
    },
  });

  if (!serviceOrder) {
    return { title: "Ordem de Serviço — Gestor Local" };
  }

  const companyName = serviceOrder.company.tradeName ?? serviceOrder.company.name;
  const osCode = serviceOrder.code ?? `OS-${String(serviceOrder.number).padStart(4, "0")}`;

  return {
    title: `${osCode} — ${companyName}`,
    description: `Acompanhe o andamento da sua ordem de serviço ${osCode} na ${companyName}.`,
  };
}

export default async function PortalOSPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return <PortalOSError type="invalid_token" />;
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
    return <PortalOSError type="not_found" />;
  }

  const safeData = sanitizeServiceOrderForPortal(serviceOrder);
  return <PortalOSContent data={safeData} />;
}