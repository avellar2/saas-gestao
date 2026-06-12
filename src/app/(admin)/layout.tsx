import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as Record<string, unknown>).role;

  if (role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">Gestor Local</h1>
          <p className="text-sm text-gray-400 mt-1">Admin Global</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/admin"
            className="block px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/empresas"
            className="block px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Empresas
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 truncate">
            {session.user?.email}
          </p>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}