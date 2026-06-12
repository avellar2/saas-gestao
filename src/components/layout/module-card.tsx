import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ModuleKey } from "@/types";

interface ModuleCardProps {
  moduleKey: ModuleKey;
  name: string;
  description: string;
  active: boolean;
}

export function ModuleCard({
  moduleKey,
  name,
  description,
  active,
}: ModuleCardProps) {
  if (active) {
    const routeMap: Record<string, string> = {
      customers: "/clientes",
      quotes: "/orcamentos",
      service_orders: "/ordens-servico",
    };

    const href = routeMap[moduleKey] || "/dashboard";

    return (
      <Link href={href}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            <ArrowRight className="size-5 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/upgrade?module=${moduleKey}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full opacity-60">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm text-gray-400">{name}</h3>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </div>
          <Lock className="size-5 text-gray-400 shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}