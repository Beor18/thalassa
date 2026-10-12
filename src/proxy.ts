import { NextResponse, type NextRequest } from "next/server";

// Same names as SESSION_COOKIE (src/server/session.ts) and LOCALE_COOKIE (src/i18n/config.ts);
// not imported to keep the proxy light.
const SESSION_COOKIE = "thalassa_session";
const LOCALE_COOKIE = "thalassa_lang";
const GAME_SECTIONS = /^\/(ciudad|isla|mundo|investigacion|militar|informes|ranking|tesoro|invitar|perfil)(\/|$)/;
const PREFIX = /^\/(en|es)(?=\/|$)/;

/**
 * Language and access in one place. URLs never carry the language: every page request is
 * rewritten to /en/… or /es/… from the player's cookie (English by default). Opening /es or
 * /en/… in the browser stores that language and lands on the clean URL, so /es works as a
 * shareable "Spanish version" link.
 *
 * Without a session cookie, game sections bounce to the landing page. That check is optimistic;
 * the real verification happens in the server DAL (requirePlayerId).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const prefixed = PREFIX.exec(pathname);
  if (prefixed) {
    if (request.headers.get("sec-fetch-dest") !== "document") return NextResponse.next(); // metadata images and the like
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(prefixed[0].length) || "/";
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE, prefixed[1], { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  }

  if (GAME_SECTIONS.test(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const lang = saved === "es" || saved === "en" ? saved : "en";
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only: no API, Next internals, static assets, files with an extension, /r/ invites or /salir.
  matcher: ["/((?!api/|_next/|assets/|r/|salir|.*\\.[a-z0-9]+$).*)"],
};
