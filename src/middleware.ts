import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter for middleware
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: 99, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > 100) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true, remaining: 100 - entry.count, retryAfter: 0 };
}

// Cleanup stale entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}, 60_000);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1";
    const { allowed, remaining, retryAfter } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: "Muitas requisicoes. Tente novamente em alguns segundos." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Pass rate limit info via headers to API routes
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

  // Public routes — no auth needed
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (NextAuth v5 uses authjs.session-token)
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");

  // API routes without session — return 401
  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}