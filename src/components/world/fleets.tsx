"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RESOURCE_INFO, type Resource } from "@/game/data";
import { fmt, fmtDuration } from "@/lib/format";
import { useServerClock } from "@/lib/use-server-clock";
import { clamp, curvePath, pointOnCurve, pointOnLoop, routeCurve, type Curve, type Pt } from "./geometry";
import type { MapIsland } from "./island-marker";
import type { FleetKind, FleetView, WorldFx } from "./types";
import { s } from "./styles";

export const FLEET_COLOR: Record<FleetKind, string> = {
  transport: "#9cc35a",
  attack: "#d63b2b",
  colonize: "#e3b341",
};

const KIND_LABEL: Record<FleetKind, string> = {
  transport: "Transporte",
  attack: "Ataque",
  colonize: "Colonia",
};

interface Route {
  fleet: FleetView;
  home: MapIsland;
  target: MapIsland;
  curve: Curve | null;
}

interface Pose extends Pt {
  angle: number;
  /** island the ship is heading to right now */
  headingTo: number;
  endsAt: number;
  done: boolean;
}

function poseAt(r: Route, now: number): Pose {
  const f = r.fleet;
  const back = f.status === "returning";
  const start = back ? f.arrivesAt : f.departsAt;
  const end = back ? (f.returnsAt ?? f.arrivesAt) : f.arrivesAt;
  const p = clamp((now - start) / Math.max(1, end - start), 0, 1);
  const headingTo = back ? r.home.id : r.target.id;
  if (!r.curve) {
    const loop = pointOnLoop({ x: r.home.px, y: r.home.py }, r.home.size, back ? 1 - p : p);
    return { ...loop, angle: back ? loop.angle + Math.PI : loop.angle, headingTo, endsAt: end, done: now >= end };
  }
  const pt = pointOnCurve(r.curve, back ? 1 - p : p);
  return { ...pt, angle: back ? pt.angle + Math.PI : pt.angle, headingTo, endsAt: end, done: now >= end };
}

function hasGoods(cargo: FleetView["cargo"]) {
  return Object.values(cargo).some((v) => (v ?? 0) > 0);
}

export function fleetRoutes(fleets: FleetView[], byId: Map<number, MapIsland>): Route[] {
  const out: Route[] = [];
  for (const fleet of fleets) {
    const home = byId.get(fleet.homeIslandId);
    const target = byId.get(fleet.targetIslandId);
    if (!home || !target) continue;
    out.push({
      fleet,
      home,
      target,
      curve: home.id === target.id ? null : routeCurve({ x: home.px, y: home.py, id: home.id }, { x: target.px, y: target.py, id: target.id }, home.size * 0.4, target.size * 0.4),
    });
  }
  return out;
}

/** Faint dashed tracks under the ships. Rendered inside the routes SVG. */
export function FleetTracks({ routes }: { routes: Route[] }) {
  return routes.map((r) =>
    r.curve ? (
      <path key={r.fleet.id} d={curvePath(r.curve)} className={s.fleetRoute} style={{ stroke: FLEET_COLOR[r.fleet.kind] }} />
    ) : null,
  );
}

function transformFor(p: Pose) {
  return `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
}

export function Fleets({
  routes,
  fx,
  serverNow,
  reducedMotion,
  onSelectIsland,
}: {
  routes: Route[];
  fx: WorldFx;
  serverNow: number;
  reducedMotion: boolean;
  onSelectIsland: (id: number) => void;
}) {
  const router = useRouter();
  const now = useServerClock(serverNow, 1000);
  const nodes = useRef(new Map<string, { root: HTMLDivElement; rotor: HTMLDivElement; hull: HTMLDivElement }>());
  const refreshed = useRef(new Set<string>());
  const [open, setOpen] = useState<string | null>(null);

  // Initial pose comes from the server time, so server HTML and hydration agree.
  const initial = useMemo(() => new Map(routes.map((r) => [r.fleet.id, poseAt(r, serverNow)])), [routes, serverNow]);

  // Sail: one rAF loop moves every ship along its curve using the server clock.
  useEffect(() => {
    if (!routes.length) return;
    const skew = serverNow - Date.now();
    let raf = 0;
    let lastWrite = 0;
    const place = (t: number) => {
      for (const r of routes) {
        const n = nodes.current.get(r.fleet.id);
        if (!n) continue;
        const p = poseAt(r, t);
        n.root.style.transform = transformFor(p);
        if (fx.shipTopDown) {
          n.rotor.style.transform = `rotate(${p.angle.toFixed(3)}rad)`;
        } else {
          // Side-view fallback art: never upside down, just face the direction of travel.
          const right = Math.cos(p.angle) > 0;
          n.rotor.style.transform = `rotate(${(right ? p.angle : p.angle + Math.PI).toFixed(3)}rad)`;
          n.hull.style.transform = right ? "scaleX(-1)" : "";
        }
      }
    };
    const frame = (ts: number) => {
      // Ships move slowly; 30 fps is plenty and halves the work.
      if (ts - lastWrite > 32) {
        lastWrite = ts;
        place(Date.now() + skew);
      }
      raf = requestAnimationFrame(frame);
    };
    if (reducedMotion) {
      place(Date.now() + skew);
      const t = setInterval(() => place(Date.now() + skew), 1000);
      return () => clearInterval(t);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [routes, serverNow, reducedMotion, fx.shipTopDown]);

  // When a ship reaches port, ask the server for the new state (once per leg).
  useEffect(() => {
    const due = routes.find((r) => {
      const key = `${r.fleet.id}:${r.fleet.status}`;
      return poseAt(r, now).done && !refreshed.current.has(key);
    });
    if (!due) return;
    refreshed.current.add(`${due.fleet.id}:${due.fleet.status}`);
    const t = setTimeout(() => router.refresh(), 800);
    return () => clearTimeout(t);
  }, [now, routes, router]);

  return routes.map((r) => {
    const f = r.fleet;
    const pose = poseAt(r, now);
    const first = initial.get(f.id) ?? pose;
    const back = f.status === "returning";
    const goods = hasGoods(f.cargo);
    const loot = back && f.kind === "attack" && goods;
    const destination = back ? `Vuelve a ${f.originName}` : `Va a ${f.targetLabel}`;
    const left = pose.endsAt - now;
    const when = left > 0 ? `llega en ${fmtDuration(left)}` : "llegando";
    const title = back ? `Regreso ${f.kind === "attack" ? "del ataque" : f.kind === "transport" ? "del transporte" : "de la colonia"}` : KIND_LABEL[f.kind];
    const label = `${title}. ${destination}, ${when}. ${f.ships} ${f.ships === 1 ? "barco" : "barcos"}${loot ? ", con botín" : ""}.`;
    const angle = fx.shipTopDown ? first.angle : Math.cos(first.angle) > 0 ? first.angle : first.angle + Math.PI;

    return (
      <div
        key={f.id}
        className={s.fleet}
        data-kind={f.kind}
        data-open={open === f.id ? "" : undefined}
        style={{ transform: transformFor(first), ["--fleet-color" as string]: FLEET_COLOR[f.kind] }}
        ref={(root) => {
          if (!root) {
            nodes.current.delete(f.id);
            return;
          }
          const rotor = root.querySelector<HTMLDivElement>("[data-rotor]");
          const hull = root.querySelector<HTMLDivElement>("[data-hull]");
          if (rotor && hull) nodes.current.set(f.id, { root, rotor, hull });
        }}
      >
        <div className={s.rotor} data-rotor style={{ transform: `rotate(${angle.toFixed(3)}rad)` }}>
          <span className={s.wake} />
          <div className={s.hull} data-side={fx.shipTopDown ? undefined : ""}>
            <div
              data-hull
              className={s.hullArt}
              style={{
                backgroundImage: `url(${fx.ship})`,
                // Top-down art has the bow pointing up; our angles use 0 = east.
                rotate: fx.shipTopDown ? "90deg" : undefined,
                transform: !fx.shipTopDown && Math.cos(first.angle) > 0 ? "scaleX(-1)" : undefined,
              }}
            />
          </div>
        </div>
        {f.kind === "attack" && !back && fx.smoke && (
          <>
            <span className={s.smoke} style={{ backgroundImage: `url(${fx.smoke})` }} />
            <span className={s.smoke} style={{ backgroundImage: `url(${fx.smoke})` }} />
          </>
        )}
        <span className={s.pennant} />
        {loot && (
          <span className={s.lootBadge} aria-hidden>
            <span
              className="block size-4 bg-contain bg-no-repeat"
              style={{ backgroundImage: `url(${RESOURCE_INFO.gold.icon})` }}
            />
          </span>
        )}
        <button
          type="button"
          className={s.fleetHit}
          aria-label={label}
          onClick={() => {
            setOpen((o) => (o === f.id ? null : f.id));
            onSelectIsland(pose.headingTo);
          }}
          onBlur={() => setOpen((o) => (o === f.id ? null : o))}
        />
        <span className={s.tip} role="tooltip">
          <span className="panel-dark flex flex-col gap-1 px-3 py-2 text-left shadow-lg">
            <span className="flex items-center gap-2 font-display text-[15px] font-bold">
              <span aria-hidden className="size-2.5 rounded-full ring-2 ring-foam/40" style={{ background: FLEET_COLOR[f.kind] }} />
              {title}
            </span>
            <span className="text-[13px] text-foam/90">
              {destination}, <span className="tabular font-bold text-foam">{when}</span>
            </span>
            {goods && (
              <span className="flex items-center gap-2 text-[13px] text-foam/90">
                {loot ? "Botín" : back ? "Trae" : "Lleva"}
                {(Object.entries(f.cargo) as [Resource, number][])
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <span key={k} className="inline-flex items-center gap-0.5 tabular font-bold text-foam">
                      <span aria-hidden className="inline-block size-4 bg-contain bg-no-repeat" style={{ backgroundImage: `url(${RESOURCE_INFO[k].icon})` }} />
                      {fmt(v)}
                    </span>
                  ))}
              </span>
            )}
          </span>
        </span>
      </div>
    );
  });
}
