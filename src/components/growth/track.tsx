"use client";

import { useEffect } from "react";
import type { ClientEvent } from "@/lib/growth/events";
import { beacon, isClientEvent, visitSource } from "@/lib/growth/beacon";

// Dedupes React StrictMode's double effect in development and quick remounts.
const recent = new Map<string, number>();

/** Sends one view event when mounted, with the visit's source (utm tags, referring host). */
export function TrackView({ event, props }: { event: ClientEvent; props?: Record<string, string | number | boolean> }) {
  const key = `${event}:${JSON.stringify(props ?? {})}`;
  useEffect(() => {
    const now = performance.now();
    if (now - (recent.get(key) ?? -Infinity) < 2000) return;
    recent.set(key, now);
    beacon(event, { ...visitSource(), ...props });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key already encodes event and props
  }, [key]);
  return null;
}

/**
 * Tracks clicks on any element marked with data-track="<event>" (and optional data-track-<prop>="value"),
 * so pages only need an attribute, not an onClick. Mount once per page.
 */
export function TrackClicks() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-track]");
      const name = el?.dataset.track;
      if (!el || !isClientEvent(name)) return;
      const props: Record<string, string> = {};
      for (const [k, v] of Object.entries(el.dataset)) {
        if (k.startsWith("trackProp") && v) props[k.slice(9).toLowerCase()] = v;
      }
      beacon(name, props);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
