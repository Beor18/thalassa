"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { CompassLoader } from "@/components/motion/compass";
import { SECTION_NARROW, SECTION_WIDE } from "@/components/tesoro/section-ui";
import { CITY_GRID, ISLAND_GRID, SceneFit } from "./scene-layout";

type Variant = "city" | "island" | "world" | "research" | "military" | "reports" | "ranking" | "treasury" | "invite" | "default";

const ROUTES: [string, Variant][] = [
  ["/ciudad", "city"],
  ["/isla", "island"],
  ["/mundo", "world"],
  ["/investigacion", "research"],
  ["/militar", "military"],
  ["/informes", "reports"],
  ["/ranking", "ranking"],
  ["/tesoro", "treasury"],
  ["/invitar", "invite"],
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

/** Island title: name and a few chips on one line. */
function TitleRow() {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="skel-line on-dark block h-8 w-40" />
      {[0, 1, 2].map((i) => (
        <span key={i} className="skel-line on-dark hidden h-7 w-16 rounded-full sm:block" />
      ))}
    </div>
  );
}

/** Dark hero band of the secondary sections: icon, big number, a few stats and (desktop) the next step on the right. */
function HeroBand({ className, stats = 3, next = false }: { className?: string; stats?: number; next?: boolean }) {
  return (
    <div className={clsx("skel-dark flex flex-wrap items-center gap-3 p-3 sm:gap-4 sm:px-5", className)}>
      <CompassLoader size={48} />
      <Lines dark widths={["w-24 h-3", "w-20 h-7"]} />
      {stats > 0 && (
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
          {Array.from({ length: stats }, (_, i) => (
            <span key={i} className="skel-line on-dark block h-12 rounded-xl sm:w-24" />
          ))}
        </div>
      )}
      {/* The next step: under the stats on phones, at the right on desktop. */}
      {next && <span className="skel-line block h-28 w-full rounded-[14px] bg-parchment/70 lg:ml-auto lg:h-[4.5rem] lg:w-[28rem] lg:max-w-[40%]" />}
    </div>
  );
}

function Body({ variant }: { variant: Variant }) {
  switch (variant) {
    case "city":
      return (
        <SceneFit>
          <div className={CITY_GRID}>
            <div className="skel-dark grid aspect-[3/2] place-items-center">
              <CompassLoader size={72} label="Cargando la ciudad" />
            </div>
            <div className="skel flex flex-col gap-4 p-4">
              <Lines widths={["w-24 h-5", "w-full h-16"]} />
              <Lines widths={["w-32 h-5", "w-3/4", "w-2/3", "w-3/4", "w-1/2"]} />
            </div>
          </div>
        </SceneFit>
      );
    case "island":
      return (
        <>
          <TitleRow />
          <SceneFit>
            <div className={ISLAND_GRID}>
              <div className="skel-dark grid aspect-[3/2] place-items-center">
                <CompassLoader size={72} label="Cargando la isla" />
              </div>
              <div className="skel flex flex-col gap-4 p-4">
                <Lines widths={["w-32 h-5", "w-full h-16"]} />
                <Lines widths={["w-3/4", "w-2/3", "w-1/2"]} />
              </div>
            </div>
          </SceneFit>
        </>
      );
    case "world":
      // The map takes the height left under the header, like the real one.
      return (
        <div className="skel-dark -mx-4 grid min-h-[360px] flex-1 place-items-center rounded-none sm:mx-0 sm:min-h-[500px] sm:rounded-2xl">
          <CompassLoader size={72} label="Cargando el mapa" />
        </div>
      );
    case "research":
      return (
        <div className={SECTION_WIDE}>
          <HeroBand className="min-h-[5.5rem]" next />
          {/* Phones: the four branches as tabs, one branch below. */}
          <div className="skel-dark grid h-[4.75rem] grid-cols-4 gap-2 p-1.5 md:hidden">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skel-line on-dark block h-full rounded-xl" />
            ))}
          </div>
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={clsx("skel flex flex-col gap-2 p-3 sm:p-4", i > 0 && "max-md:hidden")}>
                <div className="flex items-center gap-3 pb-1">
                  <span className="skel-line block size-10 rounded-full" />
                  <span className="skel-line block h-5 flex-1" />
                </div>
                {[0, 1, 2].map((j) => (
                  <span key={j} className={clsx("skel-line block h-16 rounded-xl", j > 0 && "ml-4")} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case "military":
      return (
        <div className={SECTION_WIDE}>
          <HeroBand className="min-h-[6.5rem]" next />
          <div className="grid items-start gap-x-3 gap-y-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <span className="skel-line on-dark block h-6 w-32" />
              <div className="skel h-44" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="skel-line on-dark block h-6 w-28" />
              <div className="skel-dark h-16" />
            </div>
          </div>
        </div>
      );
    case "reports":
      return (
        <div className={SECTION_NARROW}>
          <div className="skel-dark flex h-[3.25rem] items-center gap-3 px-3 sm:px-4">
            <span className="skel-line on-dark block size-9 rounded-full" />
            <span className="skel-line on-dark block h-6 w-36" />
            <CompassLoader size={32} className="ml-auto" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel flex h-16 items-center gap-3 px-3">
              <span className="skel-line block size-10 shrink-0 rounded-full" />
              <Lines widths={["w-40 h-4", "w-3/4"]} className="flex-1" />
            </div>
          ))}
        </div>
      );
    case "ranking":
      return (
        <div className={SECTION_NARROW}>
          <div className="grid gap-3 lg:grid-cols-2">
            <HeroBand className="min-h-36 lg:min-h-56" stats={0} />
            <div className="skel-dark hidden min-h-56 items-end justify-center gap-3 px-6 lg:flex">
              {["h-24", "h-32", "h-16"].map((h, i) => (
                <span key={i} className={clsx("skel-line on-dark block w-1/4 rounded-t-xl rounded-b-none", h)} />
              ))}
            </div>
          </div>
          <div className="skel flex flex-col gap-3 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="skel-line block size-7 rounded-full" />
                <span className="skel-line block h-4 flex-1" />
                <span className="skel-line block h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      );
    case "treasury":
      return (
        <div className={SECTION_NARROW}>
          <HeroBand className="min-h-[5.25rem]" stats={0} />
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <div className="skel flex flex-col gap-3 p-4">
              <Lines widths={["w-40 h-6"]} />
              <span className="skel-dark block h-14" />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="skel-line block h-24 rounded-xl" />
                ))}
              </div>
              <span className="skel-line block h-12 rounded-xl" />
            </div>
            <div className="skel flex flex-col gap-3 p-4">
              <Lines widths={["w-36 h-6", "w-28"]} />
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="skel-line block h-[4.5rem] rounded-xl" />
                ))}
              </div>
              <span className="skel-line block h-12 w-48 rounded-lg" />
            </div>
          </div>
        </div>
      );
    case "invite":
      return (
        <div className={SECTION_NARROW}>
          <div className="skel-dark flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <CompassLoader size={48} />
              <Lines dark widths={["w-64 max-w-full h-7", "w-48"]} />
            </div>
            <div className="flex gap-2">
              <span className="skel-line on-dark block h-12 flex-1 rounded-xl" />
              <span className="skel-line on-dark block h-12 w-32 rounded-xl sm:w-44" />
            </div>
          </div>
          <div className="grid items-start gap-3 md:grid-cols-2">
            <div className="skel h-28" />
            <div className="flex flex-col gap-3">
              <span className="skel-line block h-11 rounded-[14px] bg-parchment/60" />
              <span className="skel-dark block h-11" />
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div className={SECTION_WIDE}>
          <HeroBand className="min-h-24" />
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <div className="skel h-72" />
            <div className="skel h-72" />
          </div>
        </div>
      );
  }
}
