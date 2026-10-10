"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { PICK_HOOK_SCRIPT, pickHook } from "@/lib/growth/beacon";
import { InlineScript } from "./inline-script";

/**
 * Landing headline A/B test without flicker. Both variants ship in the HTML; an inline script picks
 * one before paint (?hook=a|b, else this tab's earlier pick, else a coin flip) and CSS shows only it.
 * On client-side navigations the same rule runs in render. The server always renders variant A.
 */
export function HookSwitch({ a, b, className }: { a: ReactNode; b: ReactNode; className?: string }) {
  const hook = typeof window === "undefined" ? undefined : pickHook();
  return (
    <div data-hook={hook} suppressHydrationWarning className={clsx("group/hook", className)}>
      <InlineScript html={PICK_HOOK_SCRIPT} />
      <div className="contents group-data-[hook=b]/hook:hidden">{a}</div>
      <div className="hidden group-data-[hook=b]/hook:contents">{b}</div>
    </div>
  );
}
