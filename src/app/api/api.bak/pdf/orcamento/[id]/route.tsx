import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { QuotePDF } from "@/components/pdf/quote-pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  // Fetch quote with customer and items
  const quote = await tenant.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!quote) {
    return NextResponse.json(
      { error: "Orcamento nao encontrado" },
      { status: 404 }
    );
  }

  // Fetch company data separately (not tenant-scoped, using base prisma)
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    return NextResponse.json(
      { error: "Empresa nao encontrada" },
      { status: 404 }
    );
  }

  const isTrial = company.status === "TRIAL";

  // Prepare data for the PDF component
  const companyData = {
    name: company.name,
    tradeName: company.tradeName,
    phone: company.phone,
    email: company.email,
    document: company.document,
    address: company.address,
  };

  const customerData = {
    name: quote.customer.name,
    phone: quote.customer.phone,
    email: quote.customer.email,
  };

  const quoteData = {
    number: quote.number,
    status: quote.status,
    description: quote.description,
    subtotal: Number(quote.subtotal),
    discount: Number(quote.discount),
    total: Number(quote.total),
    validUntil: quote.validUntil?.toISOString(),
    notes: quote.notes,
    createdAt: quote.createdAt.toISOString(),
  };

  const itemsData = quote.items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    total: Number(item.total),
  }));

  try {
    const pdfBuffer = await renderToBuffer(
      <QuotePDF
        company={companyData}
        customer={customerData}
        quote={quoteData}
        items={itemsData}
        isTrial={isTrial}
      />
    );

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="orcamento-${quote.number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Erro ao gerar PDF" },
      { status: 500 }
    );
  }
}