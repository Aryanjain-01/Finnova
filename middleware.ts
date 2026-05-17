import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/transactions", "/budgets", "/accounts", "/settings"];
const authPrefixes = ["/login", "/register"];

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const loggedIn =
    Boolean(req.cookies.get("authjs.session-token")?.value) ||
    Boolean(req.cookies.get("__Secure-authjs.session-token")?.value) ||
    Boolean(req.cookies.get("next-auth.session-token")?.value) ||
    Boolean(req.cookies.get("__Secure-next-auth.session-token")?.value);

  const isProtected = protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = authPrefixes.some((p) => path === p || path.startsWith(`${p}/`));

  if (isProtected && !loggedIn) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }
  if (isAuthPage && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (path === "/" && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (path === "/" && !loggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
