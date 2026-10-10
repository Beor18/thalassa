import { CLIENT_EVENTS, type ClientEvent } from "./events";

/**
 * Sends a first-party funnel event to /api/t. Browser only, fire and forget.
 * No cookies: the visit id lives in sessionStorage and dies with the tab.
 * Respects Global Privacy Control and Do Not Track.
 */

type Props = Record<string, string | number | boolean | undefined>;

const SID_KEY = "thalassa_sid";

function visitId(): string | undefined {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      sid = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return undefined;
  }
}

function optedOut() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

export function isClientEvent(name: string | undefined): name is ClientEvent {
  return !!name && (CLIENT_EVENTS as readonly string[]).includes(name);
}

export function beacon(e: ClientEvent, props?: Props) {
  if (typeof window === "undefined" || optedOut()) return;
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props ?? {})) if (v !== undefined) p[k] = v;
  const body = JSON.stringify({ e, p, sid: visitId() });
  try {
    if (navigator.sendBeacon?.("/api/t", new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
}

const CAMPAIGN = /^[a-z0-9_.-]{1,40}$/i;

/** Where this visit came from: utm tags and the referring site's host (never the full URL). */
export function visitSource(): Props {
  const out: Props = {};
  try {
    const q = new URLSearchParams(location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
      const v = q.get(key);
      if (v && CAMPAIGN.test(v)) out[key] = v.toLowerCase();
    }
    if (document.referrer) {
      const host = new URL(document.referrer).host;
      if (host && host !== location.host) out.from = host.slice(0, 64);
    }
  } catch {
    // ignore malformed referrers
  }
  return out;
}
