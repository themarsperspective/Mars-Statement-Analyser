import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, computeAuthToken } from "@/lib/authToken";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  const rawNext = String(form.get("next") || "/statements");
  const next = rawNext.startsWith("/") ? rawNext : "/statements";

  const expectedPassword = process.env.STATEMENTS_PASSWORD;

  if (!expectedPassword || password !== expectedPassword) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "1");
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const token = await computeAuthToken(password);
  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // No maxAge/expires — a session cookie, cleared when the browser closes.
  });
  return res;
}
