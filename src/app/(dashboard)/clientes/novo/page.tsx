import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import NovoClienteContent from "./NovoClienteContent";

export default async function NovoClientePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "customers");
  if (!hasAccess) redirect("/upgrade?module=customers");

  return <NovoClienteContent />;
}