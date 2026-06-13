import { CompanyStatus } from "@/generated/prisma/client";

export interface CompanyLimits {
  customers: number;
  quotes: number;
  serviceOrders: number;
  users: number;
  inventory: number;
  finance: number;
  scheduling: number;
  catalog: number;
  menu: number;
}

const TRIAL_LIMITS: CompanyLimits = {
  customers: 20,
  quotes: 20,
  serviceOrders: 20,
  users: 1,
  inventory: 50,
  finance: 50,
  scheduling: 30,
  catalog: 20,
  menu: 20,
};

const UNLIMITED: CompanyLimits = {
  customers: Infinity,
  quotes: Infinity,
  serviceOrders: Infinity,
  users: Infinity,
  inventory: Infinity,
  finance: Infinity,
  scheduling: Infinity,
  catalog: Infinity,
  menu: Infinity,
};

export function getCompanyLimits(status: CompanyStatus): CompanyLimits {
  if (status === "TRIAL") {
    return TRIAL_LIMITS;
  }
  return UNLIMITED;
}

export function isTrialLimitReached(
  status: CompanyStatus,
  resource: keyof CompanyLimits,
  currentCount: number
): boolean {
  const limits = getCompanyLimits(status);
  return currentCount >= limits[resource];
}