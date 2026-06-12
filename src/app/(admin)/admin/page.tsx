import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  const [total, trial, active, suspended] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: "TRIAL" } }),
    prisma.company.count({ where: { status: "ACTIVE" } }),
    prisma.company.count({ where: { status: "SUSPENDED" } }),
  ]);

  const cards = [
    { title: "Total Empresas", value: total, color: "text-gray-900" },
    { title: "Em Teste", value: trial, color: "text-blue-600" },
    { title: "Ativas", value: active, color: "text-green-600" },
    { title: "Suspensas", value: suspended, color: "text-red-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}