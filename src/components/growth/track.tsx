"use client";

import { useEffect } from "react";
import type { ClientEvent } from "@/lib/growth/events";
import { beacon, isClientEvent, readHook, visitSource } from "@/lib/growth/beacon";

// Dedupes React StrictMode's double effect in development and quick remounts.
const recent = new Map<string, number>();

/**
 * Sends one view event when mounted, with the visit's source (utm tags, referring host).
 * `withHook` adds the landing headline variant this tab saw.
 */
export function TrackView({
  event,
  props,
  withHook = false,
}: {
  event: ClientEvent;
  props?: Record<string, string | number | boolean>;
  withHook?: boolean;
}) {
  const key = `${event}:${JSON.stringify(props ?? {})}`;
  useEffect(() => {
    const now = performance.now();
    if (now - (recent.get(key) ?? -Infinity) < 2000) return;
    recent.set(key, now);
    beacon(event, { ...visitSource(), ...(withHook ? { hook: readHook() } : null), ...props });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key already encodes event and props
  }, [key]);
  return null;
}

/**
 * Tracks clicks on any element marked with data-track="<event>" (and optional data-track-prop-<name>="value"),
 * so pages only need an attribute, not an onClick. Mount once per page. `withHook` adds the headline variant.
 */
export function TrackClicks({ withHook = false }: { withHook?: boolean }) {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-track]");
      const name = el?.dataset.track;
      if (!el || !isClientEvent(name)) return;
      const props: Record<string, string> = {};
      const hook = withHook ? readHook() : undefined;
      if (hook) props.hook = hook;
      for (const [k, v] of Object.entries(el.dataset)) {
        if (k.startsWith("trackProp") && v) props[k.slice(9).toLowerCase()] = v;
      }
      beacon(name, props);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [withHook]);
  return null;
}
