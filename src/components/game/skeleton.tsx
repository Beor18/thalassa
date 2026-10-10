"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { CompassLoader } from "@/components/motion/compass";

type Variant = "city" | "island" | "world" | "research" | "military" | "reports" | "ranking" | "treasury" | "default";

const ROUTES: [string, Variant][] = [
  ["/ciudad", "city"],
  ["/isla", "island"],
  ["/mundo", "world"],
  ["/investigacion", "research"],
  ["/militar", "military"],
  ["/informes", "reports"],
  ["/ranking", "ranking"],
  ["/tesoro", "treasury"],
];

/**
 * Placeholders shaped like the section that is loading, so nothing jumps when it arrives.
 * `routeAware` reads the URL (inside its own Suspense, since dynamic routes can't know it while
 * prerendering); without it, a generic layout.
 */
export function SkeletonBody({ routeAware = false }: { routeAware?: boolean }) {
  return routeAware ? <RouteSkeleton /> : <Body variant="default" />;
}

function RouteSkeleton() {
  const pathname = usePathname();
  const variant = ROUTES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "default";
  return <Body variant={variant} />;
}

function Lines({ widths, dark, className }: { widths: string[]; dark?: boolean; className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      {widths.map((w, i) => (
        <span key={i} className={clsx("skel-line block h-3.5", dark && "on-dark", w)} />
      ))}
    </div>
  );
}

function Title({ wide = "w-56" }: { wide?: string }) {
  return (
    <div className="flex flex-col gap-2 py-1">
      <span className={clsx("skel-line on-dark block h-7", wide)} />
      <span className="skel-line on-dark block h-3.5 w-72 max-w-full" />
    </div>
  );
}

function HeroBand({ className }: { className?: string }) {
  return (
    <div className={clsx("skel-dark flex items-center gap-4 p-4 sm:p-5", className)}>
      <CompassLoader size={56} />
      <Lines dark widths={["w-28", "w-44 h-7", "w-64 max-w-full"]} className="flex-1" />
    </div>
  );
}

function Body({ variant }: { variant: Variant }) {
  switch (variant) {
    case "city":
      return (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="skel-dark grid aspect-[3/2] place-items-center">
            <CompassLoader size={72} label="Cargando la ciudad" />
          </div>
          <div className="skel flex flex-col gap-4 p-4">
            <Lines widths={["w-24 h-5", "w-full h-16"]} />
            <Lines widths={["w-32 h-5", "w-3/4", "w-2/3", "w-3/4", "w-1/2"]} />
          </div>
        </div>
      );
    case "island":
      return (
        <div className="skel-dark grid aspect-[4/3] place-items-center sm:aspect-[16/10]">
          <CompassLoader size={72} label="Cargando la isla" />
        </div>
      );
    case "world":
      return (
        <>
          <Title wide="w-40" />
          <div className="skel-dark grid aspect-[4/3] place-items-center sm:aspect-[16/10]">
            <CompassLoader size={72} label="Cargando el mapa" />
          </div>
        </>
      );
    case "research":
      return (
        <>
          <HeroBand className="min-h-28" />
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skel flex flex-col gap-2 p-3 sm:p-4">
                <div className="flex items-center gap-3 pb-1">
                  <span className="skel-line block size-10 rounded-full" />
                  <span className="skel-line block h-5 flex-1" />
                </div>
                {[0, 1, 2].map((j) => (
                  <span key={j} className={clsx("skel-line block h-24 rounded-xl", j > 0 && "ml-4")} />
                ))}
              </div>
            ))}
          </div>
        </>
      );
    case "ranking":
      return (
        <>
          <HeroBand className="min-h-24" />
          <div className="skel h-36" />
          <div className="skel flex flex-col gap-3 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="skel-line block size-7 rounded-full" />
                <span className="skel-line block h-4 flex-1" />
                <span className="skel-line block h-4 w-16" />
              </div>
            ))}
          </div>
        </>
      );
    case "treasury":
      return (
        <>
          <HeroBand className="min-h-32" />
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="skel flex flex-col gap-4 p-4 sm:p-5">
              <Lines widths={["w-48 h-6", "w-72 max-w-full"]} />
              <span className="skel-dark block h-36" />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="skel-line block h-24 rounded-xl" />
                ))}
              </div>
              <span className="skel-line block h-12 w-48 rounded-lg" />
            </div>
            <div className="skel flex flex-col gap-4 p-4 sm:p-5">
              <Lines widths={["w-36 h-6", "w-64 max-w-full"]} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="skel-line block h-14 rounded-xl" />
                ))}
              </div>
              <span className="skel-line block h-12 w-56 rounded-lg" />
            </div>
          </div>
        </>
      );
    case "military":
      return (
        <>
          <div className="flex flex-col gap-2">
            <span className="skel-line on-dark block h-8 w-56" />
            <div className="skel-dark flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
              <CompassLoader size={32} />
              {[0, 1, 2, 3, 4].map((i) => (
                <Lines key={i} dark widths={["w-20 h-3", "w-12 h-4"]} />
              ))}
            </div>
          </div>
          <span className="skel-line on-dark block h-6 w-32" />
          <div className="skel h-24" />
          <span className="skel-line on-dark block h-6 w-28" />
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <div className="skel h-64" />
            <div className="skel hidden h-64 lg:block" />
          </div>
        </>
      );
    case "reports":
      return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <Title wide="w-40" />
            <CompassLoader size={40} />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel overflow-hidden">
              <span className="block h-10 bg-ink/10" />
              <Lines widths={["w-2/3 h-4", "w-1/2", "w-full h-16"]} className="p-4" />
            </div>
          ))}
        </div>
      );
    default:
      return (
        <>
          <HeroBand className="min-h-24" />
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <div className="skel h-72" />
            <div className="skel h-72" />
          </div>
        </>
      );
  }
}
