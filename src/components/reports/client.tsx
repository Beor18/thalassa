"use client";

import { startTransition, useEffect, useRef, useState } from "react";
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
  return <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-extrabold text-marble">Nuevo</span>;
}

/** Header line that keeps describing what was new when the page opened. */
export function UnreadSummary({ unread, total }: { unread: number; total: number }) {
  const [initial] = useState(unread);
  return (
    <p className="text-sm text-foam/85">
      {total === 0
        ? "Batallas, envíos y colonias aparecen acá."
        : initial > 0
          ? initial === 1
            ? "Tenés 1 informe nuevo."
            : `Tenés ${initial} informes nuevos.`
          : "Estás al día."}
    </p>
  );
}
