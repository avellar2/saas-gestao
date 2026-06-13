import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import UsuariosDetailContent from "./UsuariosDetailContent";

export default async function UsuarioDetailPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "users_permissions");
  if (!hasAccess) redirect("/upgrade?module=users_permissions");

  return <UsuariosDetailContent />;
}
