import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import NovoEstoqueContent from "./NovoEstoqueContent";

export default async function NovoEstoquePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "inventory");
  if (!hasAccess) redirect("/upgrade?module=inventory");

  return <NovoEstoqueContent />;
}
