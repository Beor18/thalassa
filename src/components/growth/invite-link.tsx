"use client";

import { useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { beacon } from "@/lib/growth/beacon";
import { INVITE_MESSAGE, shareLinks } from "@/lib/growth/invite-share";

const noopSubscribe = () => () => {};
const canShareNow = () => typeof navigator !== "undefined" && typeof navigator.share === "function";
const originNow = () => location.origin;

function CopyGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const BRAND_BUTTON =
  "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border px-4 font-bold tracking-wide whitespace-nowrap transition-[filter,transform] duration-100 hover:brightness-110 active:translate-y-px";

/**
 * The player's invite link, ready to send: WhatsApp and X open with the message and link already
 * written, and the link itself can be copied (or shared through the device's sheet where there is one).
 */
export function InviteLink({ path, fallbackOrigin, tone = "light" }: { path: string; fallbackOrigin: string; tone?: "light" | "dark" }) {
  const { t } = useI18n();
  const origin = useSyncExternalStore(noopSubscribe, originNow, () => fallbackOrigin);
  const canShare = useSyncExternalStore(noopSubscribe, canShareNow, () => false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const url = `${origin}${path}`;
  const dark = tone === "dark";
  const message = t(INVITE_MESSAGE);
  const intents = shareLinks(message, url);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setNote({ ok: true, text: t({ en: "Link copied. Send it to your friends.", es: "Link copiado. Pegalo donde está tu gente." }) });
      beacon("invite_copy");
    } catch {
      setNote({
        ok: false,
        text: t({
          en: "Couldn't copy it. Press and hold the link to copy it by hand.",
          es: "No pudimos copiarlo. Mantené apretado el link y copialo a mano.",
        }),
      });
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "Thalassa",
        // Goes to other apps next to the link, in the player's language.
        text: message,
        url,
      });
      beacon("invite_share");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") await copy();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t({ en: "Your invite link", es: "Tu link de invitación" })}</span>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 w-full min-w-0 rounded-lg border border-parchment-3 bg-marble px-3 font-bold text-ink tabular-nums"
          />
        </label>
        <Button size="lg" variant="secondary" onClick={copy} className="sm:min-w-36">
          <CopyGlyph />
          {t({ en: "Copy link", es: "Copiar link" })}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={intents.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => beacon("invite_whatsapp")}
          className={clsx(BRAND_BUTTON, "border-[#128c7e] bg-[#25d366] text-[#052e1c]")}
        >
          <WhatsAppGlyph />
          {t({ en: "Send on WhatsApp", es: "Mandar por WhatsApp" })}
        </a>
        <a
          href={intents.x}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => beacon("invite_x")}
          className={clsx(BRAND_BUTTON, "border-white/25 bg-black text-white")}
        >
          <XGlyph />
          {t({ en: "Post on X", es: "Publicar en X" })}
        </a>
        {canShare && (
          <Button size="lg" variant="secondary" onClick={share} className="flex-1 sm:flex-none">
            {t({ en: "More apps", es: "Otras apps" })}
          </Button>
        )}
      </div>
      <p
        role="status"
        aria-live="polite"
        className={clsx(
          "min-h-5 text-sm font-bold",
          note?.ok === false ? (dark ? "text-danger-soft" : "text-danger") : dark ? "text-[#9fe0a0]" : "text-success",
        )}
      >
        {note?.text}
      </p>
    </div>
  );
}
