import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { ServiceOrderPDF } from "@/components/pdf/service-order-pdf";

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

  // Fetch service order with customer, items, and linked quote
  const serviceOrder = await tenant.serviceOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        orderBy: { createdAt: "asc" },
      },
      quote: {
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
        },
      },
      technician: {
        select: { id: true, name: true },
      },
    },
  });

  if (!serviceOrder) {
    return NextResponse.json(
      { error: "Ordem de servico nao encontrada" },
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
    finalAmount: serviceOrder.finalAmount ? Number(serviceOrder.finalAmount) : null,
    paidAmount: Number(serviceOrder.paidAmount),
    paymentStatus: serviceOrder.paymentStatus,
    paymentMethod: serviceOrder.paymentMethod,
    receivedAt: serviceOrder.receivedAt?.toISOString() || null,
    expectedDeliveryDate: serviceOrder.expectedDeliveryDate?.toISOString() || null,
    completedAt: serviceOrder.completedAt?.toISOString() || null,
    warrantyEnabled: serviceOrder.warrantyEnabled,
    warrantyEndDate: serviceOrder.warrantyEndDate?.toISOString() || null,
    warrantyTerms: serviceOrder.warrantyTerms,
    customerNotes: serviceOrder.customerNotes,
    internalNotes: serviceOrder.internalNotes,
    openedAt: serviceOrder.openedAt.toISOString(),
    finishedAt: serviceOrder.finishedAt?.toISOString() || null,
    notes: serviceOrder.notes,
    technicianName: serviceOrder.technician?.name || null,
  };

  const itemsData = serviceOrder.items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    total: Number(item.total),
  }));

  try {
    const pdfBuffer = await renderToBuffer(
      <ServiceOrderPDF
        company={companyData}
        customer={customerData}
        serviceOrder={serviceOrderData}
        items={itemsData}
        isTrial={isTrial}
      />
    );

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="os-${serviceOrder.number}.pdf"`,
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