import { DEFAULT_LOCALE, type Locale, type Text } from "@/i18n/config";

/*
  Everything an invite says when it travels: the link, the message that goes with it, and the
  preview card chats draw from /r/<code> (title, description, image). Pure module: used by the
  invite page, the /r route and its image.
*/

/** /r/<code>, plus the sharer's language when it isn't the default, so the preview reads like the message. */
export function invitePath(code: string, lang: Locale) {
  return lang === DEFAULT_LOCALE ? `/r/${code}` : `/r/${code}?lang=${lang}`;
}

/** The preview image of an invite link. */
export function inviteImagePath(code: string, lang: Locale) {
  return `/r/${code}/og?lang=${lang}`;
}

/** Message that goes next to the link in WhatsApp, X or any app. */
export const INVITE_MESSAGE: Text = {
  en: "I saved you a spot in the Aegean 🏛️ Found your polis in Thalassa with my link and we both get Nectar. It's free and runs in your browser.",
  es: "Te guardo un lugar en el Egeo 🏛️ Fundá tu polis en Thalassa con mi link y ganamos néctar los dos. Es gratis y se juega en el navegador.",
};

export const inviteTitle = (name: string): Text => ({
  en: `${name} invites you to Thalassa`,
  es: `${name} te invita a Thalassa`,
});

export const INVITE_DESCRIPTION: Text = {
  en: "Found your polis in the Aegean, 10 minutes a day. Free, no signup, right in your browser.",
  es: "Fundá tu polis en el Egeo, 10 minutos por día. Gratis, sin registrarte y en el navegador.",
};

/** Share intents that open the app with the message and link already written. */
export function shareLinks(message: string, url: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${message}\n\n${url}`)}`,
    x: `https://x.com/intent/post?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`,
  };
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * The page /r/<code> answers with: link-preview tags for the chat apps (they don't follow
 * script or meta refresh) and an instant hop to the game for people. Player names are escaped.
 */
export function inviteHtml(p: {
  lang: Locale;
  title: string;
  description: string;
  /** absolute URL of this invite link */
  url: string;
  /** absolute URL of the preview image */
  image: string;
  imageAlt: string;
  /** where people go next */
  target: string;
  openLabel: string;
}) {
  const ogLocale = p.lang === "es" ? "es_AR" : "en_US";
  const target = esc(p.target);
  return `<!doctype html>
<html lang="${p.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Thalassa">
<meta property="og:locale" content="${ogLocale}">
<meta property="og:url" content="${esc(p.url)}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:image" content="${esc(p.image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${esc(p.image)}">
<meta name="twitter:image:alt" content="${esc(p.imageAlt)}">
<meta http-equiv="refresh" content="0;url=${target}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#061a30;color:#e6f3fb;font:600 18px system-ui,sans-serif}a{color:#e3b341}</style>
</head>
<body>
<a href="${target}">${esc(p.openLabel)}</a>
<script>location.replace(${JSON.stringify(p.target).replace(/</g, "\\u003c")})</script>
</body>
</html>`;
}
