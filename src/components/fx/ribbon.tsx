import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { fx as scene } from "./classes";

/**
 * Name banner for a spot on a painted scene. Sits under the sprite (`top`, % of the spot box).
 * `reveal` hides it until the spot is hovered or focused; the parent link must have `group`.
 */
export function SceneRibbon({
  title,
  sub,
  tone = "parchment",
  top = 90,
  reveal = false,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  tone?: "parchment" | "gold" | "dark";
  top?: number;
  reveal?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        scene.ribbon,
        tone === "gold" && scene.ribbonGold,
        tone === "dark" && scene.ribbonDark,
        reveal && scene.reveal,
        className,
      )}
      style={{ "--top": `${top}%` } as CSSProperties}
    >
      <span className={scene.ribbonFace}>
        <span className={scene.ribbonTitle}>{title}</span>
        {sub && <span className={scene.ribbonSub}>{sub}</span>}
      </span>
    </span>
  );
}
