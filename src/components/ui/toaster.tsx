"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Toast = { id: number; text: string; kind: "ok" | "error" };
const EVENT = "thalassa:toast";
const LIFETIME = 4200;

export function toast(text: string, kind: Toast["kind"] = "ok") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, kind } }));
}

/** Phones and tablets: the bottom belongs to the section bar and the plot sheets. */
const TOP_QUERY = "(max-width: 1023.98px)";
const subscribeTop = (onChange: () => void) => {
  const mq = window.matchMedia(TOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useToastsOnTop = () =>
  useSyncExternalStore(
    subscribeTop,
    () => window.matchMedia(TOP_QUERY).matches,
    () => false,
  );

/**
 * Parchment notes. On desktop they rise from the bottom right; on phones and tablets they drop
 * from the top, so they never cover the section bar or an open sheet. Newest nearest the edge,
 * up to four stacked. Hover or focus pauses the timer; swipe sideways or tap the close button to dismiss.
 */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const { text, kind } = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const id = ++seq;
      setItems((prev) => [...prev.slice(-3), { id, text, kind }]);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);
  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));
  const onTop = useToastsOnTop();

  return (
    <section
      aria-label="Avisos"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col-reverse items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6 lg:top-auto lg:bottom-0 lg:flex-col lg:items-end lg:pt-0 lg:pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((t) => (
          <ToastItem key={t.id} toast={t} fromTop={onTop} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </section>
  );
}

function ToastItem({ toast: t, fromTop, onDismiss }: { toast: Toast; fromTop: boolean; onDismiss: () => void }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(LIFETIME);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => dismissRef.current(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(800, remaining.current - (Date.now() - started));
    };
  }, [paused]);

  const ok = t.kind === "ok";
  return (
    <motion.div
      layout={!reduce}
      role={ok ? "status" : "alert"}
      initial={{ opacity: 0, y: fromTop ? -24 : 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 600) onDismiss();
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={clsx(
        "pointer-events-auto relative flex w-full max-w-md touch-pan-y items-start gap-3 overflow-hidden rounded-xl border py-2.5 pr-1.5 pl-3 shadow-[0_14px_34px_-12px_rgb(6_26_48/0.75)] select-none",
        ok ? "border-parchment-3 bg-parchment text-ink" : "border-[#7d1a14] bg-[#fbe3dc] text-ink",
      )}
    >
      <span aria-hidden className={clsx("absolute inset-y-0 left-0 w-1", ok ? "bg-gradient-to-b from-gold to-bronze" : "bg-danger")} />
      <span
        aria-hidden
        className={clsx(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ring-1",
          ok ? "bg-olive text-marble ring-olive/40" : "bg-danger text-marble ring-danger/40",
        )}
      >
        {ok ? <LaurelCheck /> : <Exclamation />}
      </span>
      <p className="min-w-0 flex-1 py-0.5 text-[15px] leading-snug font-bold">{t.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="-my-1 grid size-10 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m4 4 8 8M12 4l-8 8" />
        </svg>
      </button>
      <span
        aria-hidden
        className={clsx("absolute bottom-0 left-0 h-0.5 w-full origin-left", ok ? "bg-bronze/45" : "bg-danger/45")}
        style={{ animation: `toast-timer ${LIFETIME}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
      />
    </motion.div>
  );
}

function LaurelCheck() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.5 3 2.8L12.5 5" />
    </svg>
  );
}

function Exclamation() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <rect x="7" y="3" width="2.2" height="7" rx="1.1" />
      <circle cx="8.1" cy="12.6" r="1.3" />
    </svg>
  );
}
