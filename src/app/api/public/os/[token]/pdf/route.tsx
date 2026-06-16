import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { PublicServiceOrderPDF } from "@/components/pdf/public-service-order-pdf";

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
          document: true,
          address: true,
        },
      },
      customer: {
        select: { name: true, phone: true, email: true },
      },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!serviceOrder) {
    return NextResponse.json(
      { error: "Ordem de serviço não encontrada" },
      { status: 404 }
    );
  }

  const companyData = {
    name: serviceOrder.company.name,
    tradeName: serviceOrder.company.tradeName,
    phone: serviceOrder.company.phone,
    email: serviceOrder.company.email,
    document: serviceOrder.company.document,
    address: serviceOrder.company.address,
  };

  const customerData = {
    name: serviceOrder.customer.name,
    phone: serviceOrder.customer.phone,
    email: serviceOrder.customer.email,
  };

  const serviceOrderData = {
    number: serviceOrder.number,
    code: serviceOrder.code,
    status: serviceOrder.status,
    priority: serviceOrder.priority,
    problemDescription: serviceOrder.problemDescription,
    serviceDescription: serviceOrder.serviceDescription,
    equipmentName: serviceOrder.equipmentName,
    equipmentBrand: serviceOrder.equipmentBrand,
    equipmentModel: serviceOrder.equipmentModel,
    serialNumber: serviceOrder.serialNumber,
    accessories: serviceOrder.accessories,
    total: Number(serviceOrder.total),
    finalAmount: serviceOrder.finalAmount != null ? Number(serviceOrder.finalAmount) : null,
    paymentStatus: serviceOrder.paymentStatus,
    receivedAt: serviceOrder.receivedAt?.toISOString() || null,
    expectedDeliveryDate: serviceOrder.expectedDeliveryDate?.toISOString() || null,
    completedAt: serviceOrder.completedAt?.toISOString() || null,
    warrantyEnabled: serviceOrder.warrantyEnabled,
    warrantyStartDate: serviceOrder.warrantyStartDate?.toISOString() || null,
    warrantyEndDate: serviceOrder.warrantyEndDate?.toISOString() || null,
    warrantyTerms: serviceOrder.warrantyTerms,
    customerNotes: serviceOrder.customerNotes,
    openedAt: serviceOrder.openedAt.toISOString(),
  };

  const itemsData = serviceOrder.items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    total: Number(item.total),
  }));

  try {
    const pdfBuffer = await renderToBuffer(
      <PublicServiceOrderPDF
        company={companyData}
        customer={customerData}
        serviceOrder={serviceOrderData}
        items={itemsData}
      />
    );

    const displayCode = serviceOrder.code || `OS-${String(serviceOrder.number).padStart(4, "0")}`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${displayCode}.pdf"`,
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