"use client";

import { useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { beacon } from "@/lib/growth/beacon";

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

/**
 * The player's invite link with one main action: share where the device can, copy everywhere else.
 * Link and button sit on one line from `sm` up.
 */
export function InviteLink({ path, fallbackOrigin, tone = "light" }: { path: string; fallbackOrigin: string; tone?: "light" | "dark" }) {
  const origin = useSyncExternalStore(noopSubscribe, originNow, () => fallbackOrigin);
  const canShare = useSyncExternalStore(noopSubscribe, canShareNow, () => false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const url = `${origin}${path}`;
  const dark = tone === "dark";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setNote({ ok: true, text: "Link copiado. Pegalo donde está tu gente." });
      beacon("invite_copy");
    } catch {
      setNote({ ok: false, text: "No pudimos copiarlo. Mantené apretado el link y copialo a mano." });
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "Thalassa",
        text: "Te guardo un lugar en el Egeo. Fundá tu polis con este link y crecemos juntos.",
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
          <span className="sr-only">Tu link de invitación</span>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 w-full min-w-0 rounded-lg border border-parchment-3 bg-marble px-3 font-bold text-ink tabular-nums"
          />
        </label>
        <div className="flex items-center gap-2">
          <Button size="lg" onClick={canShare ? share : copy} className="flex-1 sm:min-w-44 sm:flex-none">
            {!canShare && <CopyGlyph />}
            {canShare ? "Compartir link" : "Copiar link"}
          </Button>
          {canShare && (
            <Button size="lg" variant="secondary" onClick={copy} aria-label="Copiar link" title="Copiar link" className="w-12 px-0">
              <CopyGlyph />
            </Button>
          )}
        </div>
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
