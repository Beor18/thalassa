import { NextResponse } from "next/server";
import { track } from "@/server/growth/analytics";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE, normalizeReferralCode } from "@/server/growth/referral-code";
import { findReferrer } from "@/server/growth/referrals";

/**
 * Invite link: /r/<code>. Remembers who invited this browser for 30 days and sends it to the landing.
 * Unknown codes just land on the home page, no error screen.
 */
export async function GET(request: Request, { params }: RouteContext<"/r/[code]">) {
  const { code: raw } = await params;
  const home = NextResponse.redirect(new URL("/", request.url), 307);
  home.headers.set("cache-control", "no-store");
  const code = normalizeReferralCode(raw);
  if (!code) return home;
  try {
    const referrer = await findReferrer(code);
    if (!referrer) return home;
    home.cookies.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
    });
    await track("invite_open", { code });
  } catch (err) {
    console.error("[thalassa] invite link failed", err);
  }
  return home;
}
