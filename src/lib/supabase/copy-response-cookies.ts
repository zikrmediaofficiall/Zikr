import type { NextResponse } from "next/server";

type ResponseWithCookies = Pick<NextResponse, "cookies">;

/**
 * Copy Supabase session refreshes onto a replacement response.
 * NextResponse.redirect() creates a new response and does not inherit the
 * mutable response cookies written by createMiddlewareClient().
 */
export function copyResponseCookies<T extends ResponseWithCookies>(
  source: ResponseWithCookies,
  target: T,
): T {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}
