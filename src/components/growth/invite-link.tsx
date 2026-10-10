"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { beacon } from "@/lib/growth/beacon";

const noopSubscribe = () => () => {};
const canShareNow = () => typeof navigator !== "undefined" && typeof navigator.share === "function";
const originNow = () => location.origin;

/** The player's invite link with one main action: share where the device can, copy everywhere else. */
export function InviteLink({ path, fallbackOrigin }: { path: string; fallbackOrigin: string }) {
  const origin = useSyncExternalStore(noopSubscribe, originNow, () => fallbackOrigin);
  const canShare = useSyncExternalStore(noopSubscribe, canShareNow, () => false);
  const [note, setNote] = useState<string | null>(null);
  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copiado. Pegalo donde está tu gente.");
      beacon("invite_copy");
    } catch {
      setNote("No pudimos copiarlo. Mantené apretado el link y copialo a mano.");
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
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold text-ink-soft">Tu link</span>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-12 w-full min-w-0 rounded-lg border border-parchment-3 bg-marble px-3 font-bold text-ink tabular-nums"
        />
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button size="lg" onClick={canShare ? share : copy} className="min-w-48">
          {canShare ? "Compartir link" : "Copiar link"}
        </Button>
        {canShare && (
          <button type="button" onClick={copy} className="min-h-10 font-bold text-bronze-dark underline underline-offset-4 hover:text-ink">
            Copiar
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm font-bold text-success">
        {note}
      </p>
    </div>
  );
}
