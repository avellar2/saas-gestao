import { UserRole, CompanyStatus } from "@/generated/prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyStatus: CompanyStatus;
}

// Re-export from modules.ts for compatibility
export type { ModuleKey } from "@/lib/modules";
export { MODULE_KEYS } from "@/lib/modules";