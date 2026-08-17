import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, computeAuthToken } from "@/lib/authToken";

// Gates saved-statement viewing only — "/" (New Analysis: upload, extract,
// edit, save) is deliberately left out of the matcher so it stays fully
// open. POST /api/statements (the save call New Analysis makes) is
// explicitly let through below; only GET (listing) is gated, since that's
// the endpoint that would otherwise let someone read the saved-statement
// data straight from the API without ever hitting the password prompt.
export const config = {
  matcher: ["/statements", "/statements/:path*", "/api/statements"],
};

export async function proxy(req: NextRequest) {
  const isApiStatements = req.nextUrl.pathname === "/api/statements";
  if (isApiStatements && req.method !== "GET") {
    return NextResponse.next();
  }

  const password = process.env.STATEMENTS_PASSWORD;
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expected = password ? await computeAuthToken(password) : null;
  const authed = Boolean(cookie && expected && cookie === expected);

  if (authed) return NextResponse.next();

  if (isApiStatements) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}
