"use client";

import { createContext, use, useCallback, useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
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
    if (!url.searchParams.has("panel")) return;
    url.searchParams.delete("panel");
    if ((window.history.state as Record<string, unknown> | null)?.[STATE_KEY]) window.history.back();
    else window.history.replaceState({}, "", url);
    const el = opener.current;
    opener.current = null;
    if (el?.isConnected) requestAnimationFrame(() => el.focus({ preventScroll: true }));
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
  kicker?: string;
  body: ReactNode;
}

/**
 * Desktop: a sticky right column that shows the open panel or the island summary.
 * Mobile: the summary sits under the scene and panels open as a bottom sheet.
 */
export function PanelHost({ panels, summary }: { panels: Record<string, PanelDef>; summary: ReactNode }) {
  const { current, close } = usePanels();
  const pathname = usePathname();
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The panel in the URL on page load: it doesn't steal focus, only panels opened afterwards do.
  const initialPanel = useRef(current);
  const panel = current ? panels[current] : null;

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

  return (
    <>
      {panel && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Cerrar panel"
          onClick={close}
          className="fixed inset-0 z-40 cursor-default bg-sea-950/60 lg:hidden"
        />
      )}
      <aside
        aria-label={panel ? undefined : "Resumen de la isla"}
        className={clsx(
          "min-w-0 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-[14px]",
          panel &&
            "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[85dvh] max-lg:animate-rise max-lg:overflow-y-auto max-lg:overscroll-contain",
          // Tablets: a centered sheet instead of a full-width slab.
          panel && "md:max-lg:right-auto md:max-lg:left-1/2 md:max-lg:w-xl md:max-lg:-translate-x-1/2",
        )}
      >
        {panel ? (
          <section
            key={current}
            aria-labelledby={headingId}
            className="panel max-lg:rounded-b-none max-lg:pb-[env(safe-area-inset-bottom)]"
          >
            <header className="sticky top-0 z-10 flex items-start gap-3 rounded-t-[14px] border-b border-parchment-3 bg-parchment px-4 pt-3 pb-3">
              <span aria-hidden className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-ink/20 lg:hidden" />
              <div className="min-w-0 flex-1 pt-1">
                {panel.kicker && <p className="text-xs font-extrabold tracking-wider text-bronze-dark uppercase">{panel.kicker}</p>}
                <h2 id={headingId} ref={headingRef} tabIndex={-1} className="font-display text-xl leading-tight font-bold">
                  {panel.title}
                </h2>
              </div>
              <a
                href={pathname}
                onClick={(e) => {
                  e.preventDefault();
                  close();
                }}
                aria-label="Cerrar panel"
                title="Cerrar (Esc)"
                className="-mr-1.5 grid size-10 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-bronze-dark"
              >
                <IconCross size={20} />
              </a>
            </header>
            <div className="flex flex-col gap-4 p-4">{panel.body}</div>
          </section>
        ) : (
          summary
        )}
      </aside>
    </>
  );
}
