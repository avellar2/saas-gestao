import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, type RateLimitConfig } from "@/lib/rate-limit";
import { ZodSchema, ZodError } from "zod";
import { isCoreModule } from "./modules";

interface SessionUser {
  id: string;
  companyId: string;
  name: string;
  companyStatus?: string;
}

async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as Record<string, unknown>;
  return {
    id: user.id as string,
    companyId: user.companyId as string,
    name: (user.name as string) || "",
    companyStatus: user.companyStatus as string | undefined,
  };
}

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  // Módulos core são sempre acessíveis
  if (isCoreModule(moduleKey)) return true;

  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export interface HandlerOptions {
  /** Module key for guard check */
  module?: string;
  /** Rate limit config */
  rateLimit?: RateLimitConfig;
}

/**
 * Validates request body against a Zod schema and returns parsed data or error response.
 */
export function validateBody<T>(schema: ZodSchema<T>, body: unknown): { data?: T; error?: Response } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      error: NextResponse.json(
        { error: firstError?.message || "Dados inválidos" },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}

/**
 * Creates an API handler context with auth, rate limiting, and tenant access.
 * Returns null if unauthorized or rate-limited.
 */
export async function createHandlerContext(
  request: Request,
  options: HandlerOptions = {}
): Promise<{
  user: SessionUser;
  companyId: string;
  tenant: ReturnType<typeof tenantPrisma>;
  hasModuleAccess: boolean;
} | null> {
  // Rate limiting
  const rateKey = getRateLimitKey(request);
  const { allowed, remaining, resetAt } = checkRateLimit(rateKey, options.rateLimit);
  if (!allowed) {
    // We can't easily return headers here, handled in each route
    return null;
  }

  // Auth
  const user = await getSessionUser();
  if (!user) return null;

  remaining; resetAt; // used implicitly

  const tenant = tenantPrisma(user.companyId);

  let hasModuleAccess = true;
  if (options.module) {
    hasModuleAccess = await checkModuleAccess(user.companyId, options.module);
  }

  return { user, companyId: user.companyId, tenant, hasModuleAccess };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
}

export function moduleInactive(): NextResponse {
  return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
}

export function notFound(entity: string = "Registro"): NextResponse {
  return NextResponse.json({ error: `${entity} nao encontrado` }, { status: 404 });
}

/**
 * Wraps an API handler with rate limiting + auth + rate limit headers.
 */
export function addRateLimitHeaders(response: NextResponse, request: Request, config?: RateLimitConfig): NextResponse {
  const key = getRateLimitKey(request);
  const { remaining, resetAt } = checkRateLimit(key, config);
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(resetAt));
  return response;
}

export { getSessionUser, checkModuleAccess };