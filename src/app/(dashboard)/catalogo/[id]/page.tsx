import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import CatalogoDetailContent from "./CatalogoDetailContent";

export default async function CatalogoDetailPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "catalog");
  if (!hasAccess) redirect("/upgrade?module=catalog");

  return <CatalogoDetailContent />;
}
