import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import NovoAgendamentoContent from "./NovoAgendamentoContent";

export default async function NovoAgendamentoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "scheduling");
  if (!hasAccess) redirect("/upgrade?module=scheduling");

  return <NovoAgendamentoContent />;
}
