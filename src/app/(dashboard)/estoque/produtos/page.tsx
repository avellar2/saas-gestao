import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { ProdutosContent } from "./ProdutosContent";

export default async function ProdutosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "inventory");
  if (!hasAccess) redirect("/upgrade?module=inventory");

  return <ProdutosContent />;
}
