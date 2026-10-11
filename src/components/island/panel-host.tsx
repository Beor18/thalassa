"use client";

import { createContext, use, useCallback, useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { fx } from "@/components/fx/classes";
import { useI18n, usePagePathname } from "@/i18n/client";
import { SHEET_QUERY, useHydrated, useMediaQuery, useSheetDialog } from "@/components/fx/hooks";
import { IconCross } from "./icons";

/*
  Island panels live in the URL (?panel=sawmill|mine|camp|plot-N) so they can be linked and reloaded.
  Switching panels only touches the browser history: every panel is already rendered on the server,
  so opening one is instant and the painted scene never flashes back to its loading state.
*/

type PanelCtx = {
  current: string | null;
  open: (id: string, opener?: HTMLElement | null) => void;
  close: () => void;
};

const Ctx = createContext<PanelCtx | null>(null);
const STATE_KEY = "thalassaPanel";

function usePanels() {
  const ctx = use(Ctx);
  if (!ctx) throw new Error("usePanels must be used inside <PanelProvider>");
  return ctx;
}

/** Closes the open panel (or sheet), e.g. from a "Back to the island" button after an action worked. */
export function useClosePanel() {
  return usePanels().close;
}

export function PanelProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("panel");
  const current = raw && ids.includes(raw) ? raw : null;
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((id: string, el?: HTMLElement | null) => {
    if (el) opener.current = el;
    const url = new URL(window.location.href);
    const wasOpen = url.searchParams.has("panel");
    url.searchParams.set("panel", id);
    if (wasOpen) {
      const pushed = Boolean((window.history.state as Record<string, unknown> | null)?.[STATE_KEY]);
      window.history.replaceState({ [STATE_KEY]: pushed }, "", url);
    } else {
      // A real history entry: the phone's back button closes the sheet.
      window.history.pushState({ [STATE_KEY]: true }, "", url);
    }
  }, []);

  const close = useCallback(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("panel");
    if (!id) return;
    url.searchParams.delete("panel");
    if ((window.history.state as Record<string, unknown> | null)?.[STATE_KEY]) window.history.back();
    else window.history.replaceState({}, "", url);
    // Opened from a link elsewhere (the advisor, a direct visit): fall back to its spot on the map.
    const el = opener.current?.isConnected ? opener.current : document.querySelector<HTMLElement>(`a[href="?panel=${CSS.escape(id)}"]`);
    opener.current = null;
    // Give focus back to what opened the panel once it is usable again (the summary stays inert
    // until the URL change lands, which can take a few frames after history.back()).
    let tries = 0;
    const refocus = () => {
      if (!el?.isConnected) return;
      if (el.closest("[inert]") && tries++ < 20) requestAnimationFrame(refocus);
      else el.focus({ preventScroll: true });
    };
    requestAnimationFrame(refocus);
  }, []);

  return <Ctx value={{ current, open, close }}>{children}</Ctx>;
}

/** Anchor that opens a panel without a server round trip. Modified clicks keep native behavior. */
export function PanelLink({
  panel,
  className,
  children,
  ...rest
}: { panel: string; className?: string; children: ReactNode } & Omit<ComponentProps<"a">, "href" | "onClick">) {
  const { current, open } = usePanels();
  return (
    <a
      {...rest}
      href={`?panel=${panel}`}
      aria-current={current === panel ? "true" : undefined}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(panel, e.currentTarget);
      }}
      className={className}
    >
      {children}
    </a>
  );
}

export interface PanelDef {
  title: string;
  kicker?: ReactNode;
  /** sprite next to the title, so the body can start with the action */
  icon?: ReactNode;
  body: ReactNode;
}

const SPRING = { type: "spring", stiffness: 420, damping: 40, mass: 0.9 } as const;

/**
 * Desktop: a column next to the scene, exactly as tall as it, showing the island summary or the
 * open panel (which scrolls inside). Phones and tablets: the summary sits under the scene and
 * panels open as a modal bottom sheet that springs up and can be swiped down.
 */
export function PanelHost({ panels, summary }: { panels: Record<string, PanelDef>; summary: ReactNode }) {
  const { current, close } = usePanels();
  const { t } = useI18n();
  const pathname = usePagePathname();
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // The panel in the URL on page load: it doesn't steal focus, only panels opened afterwards do.
  const initialPanel = useRef(current);
  const panel = current ? panels[current] : null;
  const isSheet = useMediaQuery(SHEET_QUERY);
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const drag = useDragControls();

  useSheetDialog(Boolean(panel) && isSheet, panelRef, headingRef);

  useEffect(() => {
    if (!current) {
      initialPanel.current = null;
      return;
    }
    if (current !== initialPanel.current) {
      headingRef.current?.focus({ preventScroll: true });
      initialPanel.current = null;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, close]);

  const hidden = isSheet ? { y: "104%" } : { opacity: 0, x: 28 };

  return (
    <aside aria-label={panel ? undefined : t({ en: "Island overview", es: "Resumen de la isla" })} className="min-w-0 lg:relative lg:self-stretch">
      <div inert={panel ? true : undefined} className={clsx("transition-opacity duration-150", panel && "lg:opacity-0")}>
        {summary}
      </div>
      <AnimatePresence initial={false}>
        {panel && (
          <motion.button
            key="backdrop"
            type="button"
            tabIndex={-1}
            aria-label={t({ en: "Close panel", es: "Cerrar panel" })}
            onClick={close}
            className="fixed inset-0 z-[70] cursor-default bg-sea-950/60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />
        )}
        {panel && (
          // Desktop: fills the column next to the scene; the panel sticks to the top while the page scrolls.
          <div key="panel" className="lg:absolute lg:inset-0">
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
              initial={hydrated && !reduce ? hidden : false}
              animate={{ opacity: 1, x: 0, y: 0 }}
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
                "fixed inset-x-0 bottom-0 z-[71] max-h-[85dvh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] text-ink outline-none",
                "rounded-t-[14px] border border-b-0 border-parchment-3 bg-parchment bg-[linear-gradient(180deg,rgb(255_255_255/0.35),transparent_40%)] shadow-panel",
                // Tablets: a centered sheet instead of a full-width slab.
                "md:max-lg:right-auto md:max-lg:left-1/2 md:max-lg:w-xl md:max-lg:-translate-x-1/2",
                "lg:sticky lg:top-3 lg:bottom-auto lg:z-10 lg:max-h-[min(100%,calc(100dvh-1.5rem))] lg:rounded-[14px] lg:border-b lg:pb-0",
              )}
            >
              <header
                className="sticky top-0 z-10 flex touch-none items-center gap-3 rounded-t-[14px] border-b border-parchment-3 bg-parchment px-4 pt-3 pb-2.5 lg:touch-auto"
                onPointerDown={(e) => {
                  if (isSheet && e.pointerType !== "mouse") drag.start(e);
                }}
              >
                <span aria-hidden className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-ink/25 lg:hidden" />
                {panel.icon && (
                  <span aria-hidden className="-my-1 grid size-12 shrink-0 place-items-center">
                    {panel.icon}
                  </span>
                )}
                <div className="min-w-0 flex-1 pt-1">
                  {panel.kicker && <p className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">{panel.kicker}</p>}
                  <h2
                    id={headingId}
                    ref={headingRef}
                    tabIndex={-1}
                    // Focus lands here by script when the panel opens; an underline is enough of a cue.
                    style={{ outline: "none" }}
                    className="font-display text-xl leading-tight font-bold decoration-bronze underline-offset-4 focus-visible:underline"
                  >
                    {panel.title}
                  </h2>
                </div>
                <a
                  href={pathname}
                  onClick={(e) => {
                    e.preventDefault();
                    close();
                  }}
                  aria-label={t({ en: "Close panel", es: "Cerrar panel" })}
                  title={t({ en: "Close (Esc)", es: "Cerrar (Esc)" })}
                  className="-mr-1.5 grid size-10 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-bronze-dark"
                >
                  <IconCross size={20} />
                </a>
              </header>
              {/* Keyed by panel: switching spots replays the short cascade. */}
              <div key={current} className={clsx("flex flex-col gap-3 p-4", hydrated && !reduce && fx.stagger)}>
                {panel.body}
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
