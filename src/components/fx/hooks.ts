"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

const noopSubscribe = () => () => {};

/**
 * False while the server HTML is being hydrated, true for anything mounted afterwards.
 * Lets a panel skip its entrance animation on a direct visit (the HTML is already on screen)
 * and play it when the player opens it.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Live media query. Always false on the server and during hydration. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below Tailwind's `lg` panels open as a bottom sheet. */
export const SHEET_QUERY = "(max-width: 1023.98px)";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behavior for a bottom sheet while `active`: the page behind stops scrolling, focus moves
 * into the sheet (to `initialFocus`) and Tab cycles inside it.
 */
export function useSheetDialog(active: boolean, panel: RefObject<HTMLElement | null>, initialFocus?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior };
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";

    const el = panel.current;
    if (el && !el.contains(document.activeElement)) (initialFocus?.current ?? el).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (current === first || !el.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !el.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previous.overflow;
      root.style.overscrollBehavior = previous.overscroll;
    };
  }, [active, panel, initialFocus]);
}
