"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";

/*
  Anchored popovers for the HUD (tooltips, menus). They live in the browser's top layer
  (popover="manual"), so no ancestor can clip them or trap them under the map: the glass bars use
  backdrop-filter, which would turn a plain position:fixed child into a local one.
  One open at a time, positioned with JS next to their trigger, closed by Escape or a click outside.
*/

type Align = "center" | "start" | "end";
type Side = "below" | "above";

export interface AnchoredPopoverOptions {
  /** Preferred side; flips when it does not fit. */
  side?: Side;
  align?: Align;
  /** Distance from the trigger, in px. */
  gap?: number;
  /** Open on mouse hover and keyboard focus (tooltips). Menus open on click only. */
  hover?: boolean;
  /** Width matches the viewport minus a margin on screens narrower than this (px). */
  fullBelow?: number;
}

const MARGIN = 8;

interface HoverHandlers {
  onPointerEnter?: (e: PointerEvent) => void;
  onPointerLeave?: (e: PointerEvent) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: () => void;
}
let openNow: { hide: () => void } | null = null;

export function useAnchoredPopover<T extends HTMLElement = HTMLButtonElement>({
  side = "below",
  align = "center",
  gap = 8,
  hover = false,
  fullBelow = 0,
}: AnchoredPopoverOptions = {}) {
  const id = useId();
  const triggerRef = useRef<T>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const self = useRef<{ hide: () => void }>({ hide: () => {} });

  const place = useCallback(() => {
    const t = triggerRef.current;
    const p = popRef.current;
    if (!t || !p || !p.isConnected) return;
    const r = t.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const full = vw < fullBelow;
    p.style.width = full ? `${vw - MARGIN * 2}px` : "";
    const w = p.offsetWidth;
    const h = p.offsetHeight;
    let left = align === "start" ? r.left : align === "end" ? r.right - w : r.left + r.width / 2 - w / 2;
    left = Math.max(MARGIN, Math.min(vw - w - MARGIN, left));
    const fitsBelow = r.bottom + gap + h <= vh - MARGIN;
    const fitsAbove = r.top - gap - h >= MARGIN;
    const above = side === "above" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
    p.style.left = `${Math.round(left)}px`;
    p.style.top = `${Math.round(above ? r.top - gap - h : r.bottom + gap)}px`;
    p.style.setProperty("--arrow-x", `${Math.round(Math.max(14, Math.min(w - 14, r.left + r.width / 2 - left)))}px`);
    p.dataset.side = above ? "above" : "below";
  }, [align, fullBelow, gap, side]);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    pinned.current = false;
    const p = popRef.current;
    if (p?.isConnected && p.matches(":popover-open")) p.hidePopover();
    if (openNow === self.current) openNow = null;
    setOpen(false);
  }, []);

  const show = useCallback(
    (pin = false) => {
      clearTimeout(timer.current);
      const p = popRef.current;
      if (!p?.isConnected || !triggerRef.current) return;
      if (pin) pinned.current = true;
      if (openNow && openNow !== self.current) openNow.hide();
      openNow = self.current;
      if (!p.matches(":popover-open")) p.showPopover();
      place();
      setOpen(true);
    },
    [place],
  );

  useLayoutEffect(() => {
    self.current.hide = hide;
  }, [hide]);

  // Closing when the section is hidden or the component leaves.
  useLayoutEffect(() => () => hide(), [hide]);

  // Content may render only while open: place again once it is in the DOM, before paint.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.PointerEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      hide();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const inside = popRef.current?.contains(document.activeElement);
      hide();
      if (inside) triggerRef.current?.focus();
    };
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, { capture: true, passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, { capture: true });
      window.removeEventListener("resize", onMove);
    };
  }, [open, hide, place]);

  const toggle = useCallback(() => {
    if (open && pinned.current) hide();
    else show(true);
  }, [open, hide, show]);

  const hoverProps: HoverHandlers = hover
    ? {
        onPointerEnter: (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => show(false), 90);
        },
        onPointerLeave: (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          clearTimeout(timer.current);
          if (!pinned.current) timer.current = setTimeout(hide, 120);
        },
        onFocus: (e: FocusEvent<HTMLElement>) => {
          if (e.currentTarget.matches(":focus-visible")) show(false);
        },
        onBlur: () => {
          if (!pinned.current) hide();
        },
      }
    : {};

  return {
    open,
    show,
    hide,
    toggle,
    /** Gives focus back to the trigger (after picking an option, for example). */
    focusTrigger: () => triggerRef.current?.focus(),
    /** Hover and focus handlers alone. */
    hoverProps,
    /** Spread on the trigger (a button): ref, hover/focus (tooltips) and click to toggle. */
    triggerProps: {
      ref: triggerRef,
      ...hoverProps,
      onClick: toggle,
      "aria-expanded": open,
      "aria-controls": id,
    },
    /** Spread on a trigger that does something else on click (a link): ref and hover/focus only. */
    anchorProps: {
      ref: triggerRef,
      ...hoverProps,
    },
    /** Spread on the popover element (rendered right after the trigger, so Tab flows into it). */
    popoverProps: {
      ref: popRef,
      id,
      popover: "manual" as const,
      ...(hover
        ? {
            onPointerEnter: () => clearTimeout(timer.current),
            onPointerLeave: (e: PointerEvent) => {
              if (e.pointerType === "mouse" && !pinned.current) timer.current = setTimeout(hide, 120);
            },
          }
        : {}),
    },
  };
}
