"use server";

import type { TenantPrismaClient } from "./prisma";

export interface LogActivityParams {
  tenant: TenantPrismaClient;
  userId?: string;
  userName?: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity:
    | "customer"
    | "quote"
    | "service_order"
    | "product"
    | "financial"
    | "appointment"
    | "catalog"
    | "menu"
    | "user"
    | "stock_movement"
    | "menu_order"
    | "restaurant_table";
  entityId?: string;
  details?: string;
}

export async function logActivity(params: LogActivityParams) {
  const { tenant, userId, userName, action, entity, entityId, details } = params;

  // tenant middleware handles companyId injection at runtime
  await tenant.activityLog.create({
    data: {
      userId,
      userName,
      action,
      entity,
      entityId: entityId ?? null,
      details: details ?? null,
    } as Parameters<typeof tenant.activityLog.create>[0]["data"],
  });
}
