"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Current time on the server's clock, re-rendering every `intervalMs`.
 * The first render returns `serverNow` exactly, so server HTML and hydration always match.
 */
export function useServerClock(serverNow: number, intervalMs = 1000): number {
  const [now, setNow] = useState(serverNow);
  const skew = useRef(0);

  useEffect(() => {
    skew.current = serverNow - Date.now();
    const t = setInterval(() => setNow(Date.now() + skew.current), intervalMs);
    return () => clearInterval(t);
  }, [serverNow, intervalMs]);

  // A fresh snapshot (newer serverNow) wins until the next tick.
  return Math.max(now, serverNow);
}
