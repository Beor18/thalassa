"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { fx } from "@/components/fx/classes";
import { SHEET_QUERY, useHydrated, useMediaQuery, useSheetDialog } from "@/components/fx/hooks";
import { plotId } from "./lib";

const SPRING = { type: "spring", stiffness: 420, damping: 40, mass: 0.9 } as const;

/**
 * Keeps the plot panel on screen while it animates out after `?slot` leaves the URL.
 * The page passes the server-rendered panel as children; when it closes, AnimatePresence keeps
 * the last copy mounted until the exit animation of the drawer inside has finished.
 */
export function SlotPresence({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <div key="slot-drawer" className="contents">
          {children}
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Chrome for the plot panel: bottom sheet on phones and tablets, a column next to the scene on
 * desktop. The content is rendered on the server; this wrapper handles opening and closing
 * (Escape, backdrop, close button, swipe down), focus, and the modal behavior of the sheet.
 */
export function SlotDrawer({
  slot,
  closeHref,
  title,
  eyebrow,
  children,
}: {
  slot: number;
  closeHref: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isSheet = useMediaQuery(SHEET_QUERY);
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const drag = useDragControls();
  const [closing, setClosing] = useState(false);

  useSheetDialog(isSheet && !closing, panelRef, headingRef);

  useEffect(() => {
    // Desktop: move focus into the panel when the player opened it (a plot or link had focus).
    // On a direct visit nothing is focused yet, so focus stays where it is. Phones: the sheet
    // is modal and takes focus itself (useSheetDialog).
    if (document.activeElement && document.activeElement !== document.body) {
      headingRef.current?.focus({ preventScroll: true });
    }
    const panel = panelRef.current;
    if (panel) panel.scrollTop = 0;
    return () => {
      // When the panel really closes (its node leaves the DOM), give focus back to the plot that
      // opened it. Switching plots keeps the node mounted, so focus stays in the panel.
      requestAnimationFrame(() => {
        if (panel?.isConnected) return;
        const active = document.activeElement;
        if (!active || active === document.body) document.getElementById(plotId(slot))?.focus({ preventScroll: true });
      });
    };
  }, [slot]);

  const close = () => {
    setClosing(true);
    router.replace(closeHref, { scroll: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      setClosing(true);
      router.replace(closeHref, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeHref, router]);

  const headingId = `slot-panel-${slot}`;
  // Animate only what the player opened: a direct visit shows the server HTML as it is.
  const animateIn = hydrated && !reduce;
  const hidden = isSheet ? { y: "104%" } : { opacity: 0, x: 28 };

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-0 z-[70] lg:hidden"
        initial={animateIn ? { opacity: 0 } : false}
        animate={{ opacity: closing ? 0 : 1 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        transition={{ duration: 0.22 }}
      >
        <Link
          href={closeHref}
          replace
          scroll={false}
          tabIndex={-1}
          onClick={() => setClosing(true)}
          className="block size-full bg-sea-950/60"
        />
      </motion.div>
      {/* Desktop: fills the column next to the scene; the panel sticks to the top while the page scrolls. */}
      <div className="lg:absolute lg:inset-0">
        <motion.section
          ref={panelRef}
          role={isSheet ? "dialog" : undefined}
          aria-modal={isSheet ? true : undefined}
          aria-labelledby={headingId}
          tabIndex={-1}
          drag={isSheet && !reduce ? "y" : false}
          dragListener={false}
          dragControls={drag}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 0.9 }}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (info.offset.y > 110 || info.velocity.y > 650) close();
          }}
          initial={animateIn ? hidden : false}
          animate={closing && isSheet ? { y: "104%" } : { opacity: 1, x: 0, y: 0 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.12 } }
              : isSheet
                ? { y: "104%", transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }
                : { opacity: 0, x: 16, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }
          }
          transition={SPRING}
          className={clsx(
            // Same look as .panel, written as utilities so the corners can change per breakpoint.
            "fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-y-auto overscroll-contain outline-none",
            "rounded-t-[14px] border border-b-0 border-parchment-3 bg-parchment bg-[linear-gradient(180deg,rgb(255_255_255/0.35),transparent_40%)] shadow-panel",
            "pb-[max(1rem,env(safe-area-inset-bottom))] text-ink",
            // Desktop: as tall as the scene at most (and never taller than the window), scrolls on its own.
            "lg:sticky lg:top-3 lg:bottom-auto lg:z-auto lg:max-h-[min(100%,calc(100dvh-1.5rem))] lg:max-w-none lg:rounded-[14px] lg:border-b lg:pb-4",
          )}
        >
          {/* Grab the handle or the header to swipe the sheet down. */}
          <div
            className="sticky top-0 z-10 touch-none rounded-t-[14px] bg-parchment/95 backdrop-blur-sm lg:touch-auto"
            onPointerDown={(e) => {
              if (isSheet && e.pointerType !== "mouse") drag.start(e);
            }}
          >
            <div aria-hidden className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-ink/25 lg:hidden" />
            <header className="flex items-start gap-3 border-b border-parchment-3/70 px-4 pt-3 pb-3">
              <div className="min-w-0 flex-1">
                {eyebrow && <p className="text-xs font-bold tracking-wider text-bronze-dark uppercase">{eyebrow}</p>}
                <h2
                  id={headingId}
                  ref={headingRef}
                  tabIndex={-1}
                  // Focus lands here by script when the panel opens; an underline is enough of a cue.
                  style={{ outline: "none" }}
                  className="font-display text-xl leading-tight font-bold text-ink decoration-bronze underline-offset-4 focus-visible:underline"
                >
                  {title}
                </h2>
              </div>
              <Link
                href={closeHref}
                replace
                scroll={false}
                aria-label="Cerrar panel"
                onClick={() => setClosing(true)}
                className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-2xl leading-none text-ink-soft transition-colors duration-100 hover:bg-ink/10 hover:text-ink"
              >
                <span aria-hidden>×</span>
              </Link>
            </header>
          </div>
          {/* Keyed by plot: switching plots replays the short cascade. */}
          <div key={slot} className={clsx("flex flex-col gap-4 px-4 pt-4", animateIn && fx.stagger)}>
            {children}
          </div>
        </motion.section>
      </div>
    </>
  );
}
