"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { BuildingType } from "@/game/data";
import { ActionButton } from "@/components/ui/action-button";
import { useI18n } from "@/i18n/client";
import { buildAction } from "@/server/actions";
import { CITY_SHEET_QUERY, cityHref, plotId } from "./lib";

/**
 * Starts a construction (new building or next level). On phones the panel is a sheet over the
 * scene: after a successful start it closes and the plot scrolls into view, so the player sees the
 * scaffolding go up instead of the sheet.
 */
export function BuildButton({
  cityId,
  slot,
  type,
  children,
  variant,
  className,
  disabled,
}: {
  cityId: string;
  slot: number;
  /** only for an empty plot */
  type?: BuildingType;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <ActionButton
      variant={variant}
      className={className}
      disabled={disabled}
      pendingLabel={t({ en: "Starting build…", es: "Arrancando obra…" })}
      action={() => buildAction({ cityId, slot, type: type ?? null })}
      onDone={(result) => {
        if (!result.ok || !window.matchMedia(CITY_SHEET_QUERY).matches) return;
        router.replace(cityHref(cityId), { scroll: false });
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Wait for the sheet to start leaving, then bring the plot to the middle of the scene.
        window.setTimeout(() => {
          document.getElementById(plotId(slot))?.scrollIntoView({ block: "center", inline: "center", behavior: reduce ? "auto" : "smooth" });
        }, 120);
      }}
    >
      {children}
    </ActionButton>
  );
}
