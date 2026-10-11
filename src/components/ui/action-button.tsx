"use client";

import { useRef, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
import { useI18n } from "@/i18n/client";
import { celebrate as burst } from "@/components/motion/celebrate";
import { Button } from "./button";
import { toast } from "./toaster";

type Props = {
  action: () => Promise<ActionResult<unknown>>;
  children: ReactNode;
  pendingLabel?: string;
  variant?: Parameters<typeof Button>[0]["variant"];
  size?: Parameters<typeof Button>[0]["size"];
  className?: string;
  disabled?: boolean;
  onDone?: (result: ActionResult<unknown>) => void;
  title?: string;
  /** Golden burst from the button when the action succeeds. Save it for moments that matter. */
  celebrate?: boolean | "gold" | "ambrosia";
};

/** Runs a server action, shows its message as a toast. The action itself refreshes the page data. */
export function ActionButton({ action, children, pendingLabel, variant, size, className, disabled, onDone, title, celebrate }: Props) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();
  return (
    <Button
      ref={ref}
      type="button"
      variant={variant}
      size={size}
      className={className}
      title={title}
      disabled={disabled}
      loading={pending}
      onClick={(e) => {
        // Keyboard activation reports (0, 0): burst from the button instead of the corner.
        const origin = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : null;
        start(async () => {
          const result = await action();
          if (result.ok) {
            if (result.message) toast(result.message);
            if (celebrate) burst(origin ?? ref.current, { tone: celebrate === "ambrosia" ? "ambrosia" : "gold" });
          } else toast(result.error, "error");
          onDone?.(result);
        });
      }}
    >
      {pending ? (pendingLabel ?? t({ en: "One moment…", es: "Un momento…" })) : children}
    </Button>
  );
}

/** Same as ActionButton but for code paths that already have a result. */
export function reportResult(result: ActionResult<unknown>) {
  if (result.ok) {
    if (result.message) toast(result.message);
  } else toast(result.error, "error");
}
