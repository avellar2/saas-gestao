import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { CozinhaContent } from "./CozinhaContent";

export default async function CozinhaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "menu");
  if (!hasAccess) redirect("/upgrade?module=menu");

  return <CozinhaContent />;
}
