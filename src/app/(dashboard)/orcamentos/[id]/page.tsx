import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import OrcamentoDetailContent from "./OrcamentoDetailContent";

export default async function OrcamentoDetailPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "quotes");
  if (!hasAccess) redirect("/upgrade?module=quotes");

  return <OrcamentoDetailContent />;
}