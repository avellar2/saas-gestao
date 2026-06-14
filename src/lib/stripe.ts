import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY nao configurada");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return _stripe;
}

export const PLANS = {
  basic: {
    name: "Básico",
    priceId: process.env.STRIPE_BASIC_PRICE_ID || "",
    description: "3 módulos",
    modules: 3,
    price: 49,
  },
  pro: {
    name: "Profissional",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    description: "Todos os módulos",
    modules: 10,
    price: 99,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}