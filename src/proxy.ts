import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, computeAuthToken } from "@/lib/authToken";

// Gates saved-statement viewing only — "/" (New Analysis: upload, extract,
// edit, save) is deliberately left out of the matcher so it stays fully
// open. POST /api/statements (the exact save call New Analysis makes) is
// explicitly let through below; everything else under /api/statements —
// GET (listing) and any nested route like the Business Club explanation
// endpoint — is gated, since those are the endpoints that would otherwise
// let someone read saved-statement data straight from the API without ever
// hitting the password prompt.
export const config = {
  matcher: ["/statements", "/statements/:path*", "/api/statements", "/api/statements/:path*"],
};

export async function proxy(req: NextRequest) {
  const isApiPath = req.nextUrl.pathname.startsWith("/api/statements");
  const isExactStatementsRoot = req.nextUrl.pathname === "/api/statements";
  if (isExactStatementsRoot && req.method !== "GET") {
    return NextResponse.next();
  }

  const password = process.env.STATEMENTS_PASSWORD;
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expected = password ? await computeAuthToken(password) : null;
  const authed = Boolean(cookie && expected && cookie === expected);

  if (authed) return NextResponse.next();

  if (isApiPath) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}
