import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getModuleKeyForPath, isModuleActive } from "@/lib/module-guard";

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = (session.user as Record<string, unknown>).role as string;
  const companyId = (session.user as Record<string, unknown>).companyId as string;

  if (pathname.startsWith("/admin")) {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/clientes") ||
    pathname.startsWith("/orcamentos") ||
    pathname.startsWith("/ordens-servico")
  ) {
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    const companyStatus = (session.user as Record<string, unknown>).companyStatus as string;
    if (companyStatus === "SUSPENDED" || companyStatus === "CANCELLED") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const moduleKey = getModuleKeyForPath(pathname);
    if (moduleKey) {
      const hasAccess = await isModuleActive(companyId, moduleKey);
      if (!hasAccess) {
        const upgradeUrl = new URL("/upgrade", req.url);
        upgradeUrl.searchParams.set("module", moduleKey);
        return NextResponse.redirect(upgradeUrl);
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/upgrade")) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};