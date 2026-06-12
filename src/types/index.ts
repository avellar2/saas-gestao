import { UserRole, CompanyStatus } from "@/generated/prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyStatus: CompanyStatus;
}

export const MODULE_KEYS = [
  "customers",
  "quotes",
  "service_orders",
  "inventory",
  "scheduling",
  "catalog",
  "menu",
  "finance",
  "reports",
  "users_permissions",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_ROUTES: Record<string, string> = {
  customers: "/clientes",
  quotes: "/orcamentos",
  service_orders: "/ordens-servico",
};