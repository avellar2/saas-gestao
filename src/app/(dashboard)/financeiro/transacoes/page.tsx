import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { TransacoesListContent } from "../TransacoesListContent";

export default async function TransacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "finance");
  if (!hasAccess) redirect("/upgrade?module=finance");

  return <TransacoesListContent title="Todas as Transações" showOrigin={true} />;
}
