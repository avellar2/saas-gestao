import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { QuotePDF } from "@/components/pdf/quote-pdf";

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
          document: true,
          address: true,
          status: true,
        },
      },
      customer: {
        select: { name: true, phone: true, email: true },
      },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!quote) {
    return NextResponse.json(
      { error: "Orcamento nao encontrado" },
      { status: 404 }
    );
  }

  const companyData = {
    name: quote.company.name,
    tradeName: quote.company.tradeName,
    phone: quote.company.phone,
    email: quote.company.email,
    document: quote.company.document,
    address: quote.company.address,
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

  const isTrial = quote.company.status === "TRIAL";

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
        "Content-Disposition": `attachment; filename="orcamento-${String(quote.number).padStart(4, "0")}.pdf"`,
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
