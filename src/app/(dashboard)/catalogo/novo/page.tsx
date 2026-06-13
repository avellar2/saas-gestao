import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import NovoCatalogoContent from "./NovoCatalogoContent";

export default async function NovoCatalogoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "catalog");
  if (!hasAccess) redirect("/upgrade?module=catalog");

  return <NovoCatalogoContent />;
}
