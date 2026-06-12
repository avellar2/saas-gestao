import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import OSDetailContent from "./OSDetailContent";

export default async function OrdemServicoDetailPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "service_orders");
  if (!hasAccess) redirect("/upgrade?module=service_orders");

  return <OSDetailContent />;
}