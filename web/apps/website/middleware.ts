import { NextResponse, type NextRequest } from "next/server";
import { safeAuth } from "@/lib/auth-helpers";

export default async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  const protectedPrefixes = ["/dashboard", "/link", "/admin"];
  const requiresAuth = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (!requiresAuth) return NextResponse.next();

  const session = await safeAuth();
  if (session?.user) return NextResponse.next();

  const signInUrl = new URL("/api/auth/signin", origin);
  signInUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
