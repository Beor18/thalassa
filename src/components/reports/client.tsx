"use client";

import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { markReportsReadAction } from "@/server/actions";

/**
 * Marks every report as read once per batch of new reports. The action refreshes the page,
 * after which there is no unread id left, so it can't loop.
 */
export function MarkReportsRead({ latestUnreadId }: { latestUnreadId: string | null }) {
  const doneFor = useRef<string | null>(null);
  useEffect(() => {
    if (!latestUnreadId || doneFor.current === latestUnreadId) return;
    doneFor.current = latestUnreadId;
    startTransition(async () => {
      await markReportsReadAction();
    });
  }, [latestUnreadId]);
  return null;
}

/** Keeps the "Nuevo" tag visible during this visit even after the reports were marked as read. */
export function NewTag({ unread }: { unread: boolean }) {
  const [isNew] = useState(unread);
  if (!isNew) return null;
  return (
    <span className="relative inline-flex shrink-0 rounded-full bg-terracotta px-2 py-0.5 text-[11px] font-extrabold text-marble">
      <span aria-hidden className="absolute inset-0 rounded-full bg-terracotta motion-safe:animate-[pulse-ring_1.6s_var(--ease-out-quint)_0.6s_3_both]" />
      <span className="relative">Nuevo</span>
    </span>
  );
}

/** Header chip that keeps saying what was new when the page opened. */
export function UnreadSummary({ unread, total }: { unread: number; total: number }) {
  const [initial] = useState(unread);
  if (total === 0) return null;
  return initial > 0 ? (
    <span className="rounded-full bg-terracotta px-2.5 py-1 text-sm font-extrabold text-marble tabular">
      {initial === 1 ? "1 nuevo" : `${initial} nuevos`}
    </span>
  ) : (
    <span className="rounded-full bg-foam/10 px-2.5 py-1 text-sm font-bold text-foam/80 ring-1 ring-foam/15">Al día</span>
  );
}

/**
 * Unread reports first, under "Nuevos", then the rest. What was new when the page opened stays on
 * top for the whole visit, even after the reports get marked as read and the page refreshes.
 */
export function ReportList({ items }: { items: { id: string; unread: boolean; node: ReactNode }[] }) {
  const [opened] = useState(() => new Set(items.filter((i) => i.unread).map((i) => i.id)));
  const isNew = (i: { id: string; unread: boolean }) => i.unread || opened.has(i.id);
  const fresh = items.filter(isNew);
  const rest = items.filter((i) => !isNew(i));
  return (
    <>
      {fresh.length > 0 && <Group title="Nuevos" items={fresh} />}
      {rest.length > 0 && <Group title={fresh.length > 0 ? "Anteriores" : null} items={rest} />}
    </>
  );
}

function Group({ title, items }: { title: string | null; items: { id: string; node: ReactNode }[] }) {
  return (
    <section aria-label={title ?? "Informes"} className="flex flex-col gap-2">
      {title && <h2 className="px-1 text-xs font-extrabold tracking-[0.2em] text-foam/75 uppercase drop-shadow">{title}</h2>}
      <ol className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.id}>{i.node}</li>
        ))}
      </ol>
    </section>
  );
}
