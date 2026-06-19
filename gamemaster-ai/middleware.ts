import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PREFIXES = ["/dashboard", "/characters", "/campaigns", "/scenarios", "/players", "/profile"];
const ADMIN_PREFIX = "/admin";
const API_PREFIX = "/api";

function isPublicApiRoute(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (
    pathname === "/api/login" ||
    pathname === "/api/register" ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/")
  ) {
    return true;
  }

  if (method !== "GET") {
    return false;
  }

  if (pathname === "/api/system/status" || pathname === "/api/system/stats") {
    return true;
  }

  if (pathname === "/api/scenarios" || pathname === "/api/scenarios/official") {
    return true;
  }

  if (
    pathname === "/api/scenarios/collections" ||
    /^\/api\/scenarios\/collections\/[^/]+$/.test(pathname)
  ) {
    return true;
  }

  const scenarioDetail = pathname.match(/^\/api\/scenarios\/([^/]+)$/);
  if (scenarioDetail) {
    const segment = scenarioDetail[1];
    return segment !== "mine" && segment !== "collections" && segment !== "official";
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith(API_PREFIX)) {
    if (isPublicApiRoute(req)) {
      return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 },
      );
    }

    if (pathname.startsWith("/api/admin") && token.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Bu işlem için yetkiniz yok" },
        { status: 403 },
      );
    }

    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAdmin = pathname.startsWith(ADMIN_PREFIX);

  if (!isProtected && !isAdmin) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/characters/:path*",
    "/campaigns/:path*",
    "/scenarios/:path*",
    "/players/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
