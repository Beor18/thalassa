import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { makeI18n } from "@/i18n/i18n";
import { INVITE_DESCRIPTION, inviteHtml, inviteImagePath, inviteTitle } from "@/lib/growth/invite-share";
import { track } from "@/server/growth/analytics";
import { getInviteCard } from "@/server/growth/invite-card";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE, normalizeReferralCode } from "@/server/growth/referral-code";

/** Link-preview fetchers (WhatsApp, X, Telegram, Slack, Discord...): they get the card but don't count as visits. */
const PREVIEW_BOT = /bot\b|crawler|spider|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|skypeuripreview|preview/i;

/**
 * Invite link: /r/<code>[?lang=es]. Answers with the invite's preview card (who invites, their polis)
 * so chats show it, remembers who invited this browser for 30 days and sends people to the landing.
 * Unknown codes just land on the home page, no error screen.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/r/[code]">) {
  const { code: raw } = await params;
  const home = NextResponse.redirect(new URL("/", request.url), 307);
  home.headers.set("cache-control", "no-store");
  const code = normalizeReferralCode(raw);
  if (!code) return home;

  const asked = request.nextUrl.searchParams.get("lang");
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const linkLang = isLocale(asked) ? asked : undefined;
  const { lang, t } = makeI18n(linkLang ?? (isLocale(saved) ? saved : "en"));

  let card;
  try {
    card = await getInviteCard(code);
  } catch (err) {
    console.error("[thalassa] invite link failed", err);
    return home;
  }
  if (!card) return home;

  const origin = request.nextUrl.origin;
  const html = inviteHtml({
    lang,
    title: t(inviteTitle(card.inviterName)),
    description: t(INVITE_DESCRIPTION),
    url: `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`,
    image: `${origin}${inviteImagePath(code, lang)}`,
    imageAlt: t({ en: "Invitation to found a polis in Thalassa", es: "Invitación para fundar una polis en Thalassa" }),
    target: "/",
    openLabel: t({ en: "Open Thalassa", es: "Abrir Thalassa" }),
  });

  const res = new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      // Crawlable so X can read the card (Twitterbot obeys robots.txt), but kept out of search results.
      "x-robots-tag": "noindex",
    },
  });
  if (PREVIEW_BOT.test(request.headers.get("user-agent") ?? "")) return res;

  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(REFERRAL_COOKIE, code, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: REFERRAL_COOKIE_MAX_AGE });
  // The friend lands in the sharer's language unless they already picked one.
  if (linkLang && !isLocale(saved)) {
    res.cookies.set(LOCALE_COOKIE, linkLang, { sameSite: "lax", path: "/", maxAge: 365 * 24 * 3600 });
  }
  await track("invite_open", { code });
  return res;
}
