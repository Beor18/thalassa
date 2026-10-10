"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";

/** A server snapshot value that keeps growing at `perHour` between refreshes. */
export function LivePoints({ value, perHour, serverNow }: { value: number; perHour: number; serverNow: number }) {
  const [clock, setClock] = useState(serverNow);

  useEffect(() => {
    if (perHour <= 0) return;
    const skew = serverNow - Date.now();
    const t = setInterval(() => setClock(Date.now() + skew), 1000);
    return () => clearInterval(t);
  }, [serverNow, perHour]);

  const hours = Math.max(0, clock - serverNow) / 3_600_000;
  return <span className="tabular-nums lining-nums">{fmt(value + perHour * hours)}</span>;
}
