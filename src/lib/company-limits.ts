import { CompanyStatus } from "@/generated/prisma/client";

export interface CompanyLimits {
  customers: number;
  quotes: number;
  serviceOrders: number;
  users: number;
}

const TRIAL_LIMITS: CompanyLimits = {
  customers: 20,
  quotes: 20,
  serviceOrders: 20,
  users: 1,
};

const UNLIMITED: CompanyLimits = {
  customers: Infinity,
  quotes: Infinity,
  serviceOrders: Infinity,
  users: Infinity,
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