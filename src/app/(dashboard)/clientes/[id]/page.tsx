import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import ClienteDetailContent from "./ClienteDetailContent";

export default async function ClienteDetailPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "customers");
  if (!hasAccess) redirect("/upgrade?module=customers");

  return <ClienteDetailContent />;
}