import { NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@/lib/prisma";
import { approveQuote } from "@/lib/quote-approve";

// Rate limit store for public endpoints
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > 10) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfter: 0 };
}

// Cleanup stale entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}, 60_000);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Token invalido" }, { status: 400 });
  }

  // Rate limit per token
  const rateLimit = checkRateLimit(`approve:${token}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

  // Find quote by token
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    select: { id: true, companyId: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Orcamento nao encontrado" }, { status: 404 });
  }

  const tenant = tenantPrisma(quote.companyId);

  const result = await approveQuote({
    tenant,
    quoteId: quote.id,
    source: "ONLINE",
  });

  if (!result.success) {
    const status = result.idempotent ? 200 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    success: true,
    idempotent: result.idempotent,
  });
}
