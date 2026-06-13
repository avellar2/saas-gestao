import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import FinanceiroDetailContent from "./FinanceiroDetailContent";

export default async function FinanceiroDetailPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "finance");
  if (!hasAccess) redirect("/upgrade?module=finance");

  return <FinanceiroDetailContent />;
}
