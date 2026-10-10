"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { BALANCE, RESOURCES, RESOURCE_INFO, UNITS, type Resource, type UnitBag, type UnitType } from "@/game/data";
import { resolveCombat, shipsForCargo, shipsForUnits } from "@/game/engine";
import { attackAction, colonizeAction, donateAction, setWorkersAction, transportAction } from "@/server/actions";
import type { ActionResult } from "@/lib/action-result";
import { Button, buttonClass } from "@/components/ui/button";
import { reportResult } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { fmt, fmtDuration } from "@/lib/format";
import { UnitPortrait } from "@/components/military/units";
import { IconCheck, IconCross } from "./icons";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const inputClass =
  "h-10 rounded-lg border border-parchment-3 bg-marble px-2.5 text-ink tabular font-bold placeholder:font-normal placeholder:text-ink-soft/80 focus-visible:ring-2 focus-visible:ring-bronze-dark aria-[invalid=true]:border-danger";

const digits = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 9);
const toInt = (v: string) => (v ? Number.parseInt(v, 10) || 0 : 0);

function useSubmit() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (run: () => Promise<ActionResult<unknown>>, onOk?: () => void) => {
    setError(null);
    start(async () => {
      const result = await run();
      reportResult(result);
      if (result.ok) onOk?.();
      else setError(result.error);
    });
  };
  return { pending, error, setError, submit };
}

function InlineError({ id, children }: { id?: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-sm font-bold text-danger">
      {children}
    </p>
  );
}

function SmallButton({ children, onClick, disabled, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="h-10 shrink-0 rounded-lg px-2.5 text-sm font-bold text-bronze-dark transition hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-bronze-dark disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Fact({ label, children, warn }: { label: string; children: ReactNode; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={clsx("tabular text-right font-bold", warn && "text-danger")}>{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workers (sawmill and luxury mine)
// ---------------------------------------------------------------------------

export function WorkersForm({
  cityId,
  field,
  current,
  max,
  capacity,
  free,
  perWorker,
  resource,
  goldPerCitizen,
}: {
  cityId: string;
  field: "woodWorkers" | "luxWorkers";
  /** workers already assigned */
  current: number;
  /** most this city can assign right now */
  max: number;
  /** places available at this level */
  capacity: number;
  free: number;
  /** resource per worker per hour (already at game speed) */
  perWorker: number;
  resource: Resource;
  /** gold per hour a free citizen pays (already at game speed) */
  goldPerCitizen: number;
}) {
  // Nobody working yet: suggest half of the free citizens so the first click already does something useful.
  const [value, setValue] = useState(() => (current === 0 ? Math.min(max, Math.floor(free / 2)) : current));
  const { pending, error, submit } = useSubmit();
  const rangeId = useId();
  const label = RESOURCE_INFO[resource].label.toLowerCase();
  const delta = value - current;
  const set = (n: number) => setValue(Math.max(0, Math.min(max, n)));

  const submitLabel =
    value === 0
      ? current === 0
        ? "Asignar trabajadores"
        : "Sacar a todos los trabajadores"
      : value === 1
        ? "Asignar 1 trabajador"
        : `Asignar ${fmt(value)} trabajadores`;

  if (max === 0) {
    return (
      <div className="rounded-xl bg-parchment-2/70 p-3 text-sm ring-1 ring-parchment-3">
        <p className="font-bold">No tenés ciudadanos libres.</p>
        <p className="text-ink-soft">Subí la Intendencia o esperá a que crezca la población.</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit(() => setWorkersAction({ cityId, [field]: value }));
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={rangeId} className="font-bold">
          Trabajadores
        </label>
        <span className="tabular text-sm text-ink-soft">
          {fmt(current)} hoy · lugar para {fmt(capacity)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          id={rangeId}
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          aria-valuetext={`${value} trabajadores`}
          className="h-10 min-w-0 flex-1 cursor-pointer accent-bronze"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label="Cantidad de trabajadores"
          value={String(value)}
          onChange={(e) => set(toInt(digits(e.target.value)))}
          className={clsx(inputClass, "w-20 text-right")}
        />
      </div>
      <dl className="flex flex-col gap-1 rounded-xl bg-parchment-2/60 p-3 text-sm ring-1 ring-parchment-3">
        <Fact label={`Producción de ${label}`}>
          <span className="inline-flex items-center gap-1">
            <ResIcon kind={resource} size={16} />+{fmt(value * perWorker)}/h
          </span>
        </Fact>
        <Fact label="Ciudadanos libres después">{fmt(free - delta)}</Fact>
        {delta !== 0 && (
          <Fact label={delta > 0 ? "Impuestos que dejás de cobrar" : "Impuestos que recuperás"} warn={delta > 0}>
            <span className="inline-flex items-center gap-1">
              <ResIcon kind="gold" size={16} />
              {delta > 0 ? "−" : "+"}
              {fmt(Math.abs(delta) * goldPerCitizen)}/h
            </span>
          </Fact>
        )}
      </dl>
      <Button type="submit" disabled={pending || delta === 0} aria-busy={pending}>
        {pending ? "Asignando…" : submitLabel}
      </Button>
      <InlineError>{error}</InlineError>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

export function DonateForm({
  cityId,
  target,
  have,
  remaining,
  nextLevel,
}: {
  cityId: string;
  target: "sawmill" | "mine";
  have: number;
  remaining: number;
  nextLevel: number;
}) {
  const [amount, setAmount] = useState("");
  const { pending, error, submit } = useSubmit();
  const id = useId();
  const n = toInt(amount);
  const tooMuch = n > have;
  const presets = [100, 500, 1000].filter((p) => p <= have && p < remaining);

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (n < 1 || tooMuch) return;
        submit(() => donateAction({ cityId, target, amount: n }), () => setAmount(""));
      }}
    >
      <label htmlFor={id} className="font-bold">
        Donar madera
      </label>
      <p className="-mt-1.5 text-sm text-ink-soft">
        Entre todos los vecinos se sube de nivel. Faltan <strong className="tabular text-ink">{fmt(remaining)}</strong> para el nivel{" "}
        {nextLevel}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="relative">
          <ResIcon kind="wood" size={18} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2" />
          <input
            id={id}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(digits(e.target.value))}
            aria-invalid={tooMuch || undefined}
            aria-describedby={tooMuch ? `${id}-err` : undefined}
            className={clsx(inputClass, "w-32 pl-9")}
          />
        </span>
        {presets.map((p) => (
          <SmallButton key={p} onClick={() => setAmount(String(p))}>
            {fmt(p)}
          </SmallButton>
        ))}
        {remaining > 0 && remaining <= have && (
          <SmallButton onClick={() => setAmount(String(remaining))}>Lo que falta</SmallButton>
        )}
      </div>
      {tooMuch && <InlineError id={`${id}-err`}>Tenés {fmt(have)} de madera en esta ciudad.</InlineError>}
      <Button type="submit" variant="secondary" disabled={pending || n < 1 || tooMuch} aria-busy={pending}>
        {pending ? "Donando…" : n > 0 ? `Donar ${fmt(n)} de madera` : "Donar madera"}
      </Button>
      <InlineError>{error}</InlineError>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Attack (barbarian camp or another player's city)
// ---------------------------------------------------------------------------

export interface AvailableUnit {
  type: UnitType;
  have: number;
}

export function AttackForm({
  originCityId,
  originName,
  available,
  shipsDocked,
  travelSec,
  target,
  defender,
  submitLabel,
  blocked,
}: {
  originCityId: string;
  originName: string;
  available: AvailableUnit[];
  shipsDocked: number;
  travelSec: number;
  target: { cityId: string } | { barbariansOnIsland: number };
  /** known defenders (barbarians) to preview the battle */
  defender?: { units: UnitBag; wall: number };
  submitLabel: string;
  /** why the attack can't leave yet (shown above the button) */
  blocked?: ReactNode;
}) {
  const [counts, setCounts] = useState<Partial<Record<UnitType, string>>>({});
  const { pending, error, submit } = useSubmit();
  const errId = useId();

  const units: UnitBag = {};
  let total = 0;
  let attack = 0;
  for (const u of available) {
    const n = Math.min(u.have, toInt(counts[u.type] ?? ""));
    if (n > 0) {
      units[u.type] = n;
      total += n;
      attack += n * UNITS[u.type].attack;
    }
  }
  const ships = total > 0 ? shipsForUnits(total) : 0;
  const lackShips = ships > shipsDocked;
  const preview = defender && total > 0 ? resolveCombat(units, defender.units, defender.wall) : null;
  const lost = preview ? Object.values(preview.attackerLosses).reduce((s, n) => s + (n ?? 0), 0) : 0;

  const fillAll = () => {
    // Send everyone the docked ships can carry, strongest first.
    let room = shipsDocked * BALANCE.unitsPerShip;
    const next: Partial<Record<UnitType, string>> = {};
    for (const u of [...available].sort((a, b) => UNITS[b.type].attack - UNITS[a.type].attack)) {
      const n = Math.min(u.have, room);
      if (n > 0) next[u.type] = String(n);
      room -= n;
    }
    setCounts(next);
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!total || lackShips || blocked) return;
        submit(() => attackAction({ originCityId, target, units }), () => setCounts({}));
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-bold">Tropas desde {originName}</p>
        <SmallButton onClick={fillAll} disabled={shipsDocked === 0}>
          Elegir todas
        </SmallButton>
      </div>
      <ul className="flex flex-col gap-2">
        {available.map((u) => {
          const def = UNITS[u.type];
          const inputId = `${errId}-${u.type}`;
          const value = counts[u.type] ?? "";
          const over = toInt(value) > u.have;
          return (
            <li key={u.type} className="flex items-center gap-2.5 rounded-xl bg-parchment-2/60 p-1.5 pr-2 ring-1 ring-parchment-3">
              <UnitPortrait unit={u.type} size={44} className="bg-transparent" />
              <label htmlFor={inputId} className="min-w-0 flex-1 leading-tight">
                <span className="block font-bold">{def.name}</span>
                <span className="block text-xs text-ink-soft">
                  En casa {fmt(u.have)} · ataque {def.attack}
                </span>
              </label>
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="0"
                value={value}
                onChange={(e) => setCounts((c) => ({ ...c, [u.type]: digits(e.target.value) }))}
                aria-invalid={over || undefined}
                className={clsx(inputClass, "w-20 text-right")}
              />
              <SmallButton label={`Usar todos (${def.name})`} onClick={() => setCounts((c) => ({ ...c, [u.type]: String(u.have) }))}>
                Máx
              </SmallButton>
            </li>
          );
        })}
      </ul>

      <dl className="flex flex-col gap-1 rounded-xl bg-parchment-2/60 p-3 text-sm ring-1 ring-parchment-3">
        <Fact label="Soldados">{fmt(total)}</Fact>
        <Fact label="Barcos" warn={lackShips}>
          {fmt(ships)} de {fmt(shipsDocked)} en el puerto
        </Fact>
        <Fact label="Llegan en">{fmtDuration(travelSec * 1000)}</Fact>
        <Fact label="Fuerza de ataque">{fmt(attack)}</Fact>
        {preview && (
          <>
            <Fact label="Defensa enemiga">{fmt(preview.defensePower)}</Fact>
            <Fact label="Botín máximo">{fmt(ships * BALANCE.shipCapacity)}</Fact>
          </>
        )}
      </dl>

      {preview && (
        <p
          className={clsx(
            "rounded-xl px-3 py-2 text-sm font-bold",
            preview.attackerWins ? "bg-success/12 text-success" : "bg-danger/10 text-danger",
          )}
        >
          {preview.attackerWins
            ? lost > 0
              ? `Pronóstico: ganás y perdés unos ${fmt(lost)} soldados.`
              : "Pronóstico: ganás sin bajas."
            : "Pronóstico: perdés. Sumá más tropas."}
        </p>
      )}
      {!defender && total > 0 && (
        <p className="text-sm text-ink-soft">No sabés cuántas tropas defienden la ciudad. Mandá de más si dudás.</p>
      )}

      {lackShips && (
        <InlineError>
          Necesitás {fmt(ships)} barcos y tenés {fmt(shipsDocked)}. Cada barco lleva {BALANCE.unitsPerShip} soldados.
        </InlineError>
      )}
      {blocked && <p className="rounded-xl bg-parchment-2 px-3 py-2 text-sm font-bold text-ink-soft">{blocked}</p>}

      <Button type="submit" size="lg" disabled={pending || !total || lackShips || Boolean(blocked)} aria-busy={pending}>
        {pending ? "Zarpando…" : submitLabel}
      </Button>
      <InlineError>{error}</InlineError>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export function TransportForm({
  originCityId,
  originName,
  targetCityId,
  targetName,
  have,
  shipsDocked,
  travelSec,
  primary = true,
}: {
  originCityId: string;
  originName: string;
  targetCityId: string;
  targetName: string;
  have: Record<Resource, number>;
  shipsDocked: number;
  travelSec: number;
  primary?: boolean;
}) {
  const [cargo, setCargo] = useState<Partial<Record<Resource, string>>>({});
  const { pending, error, submit } = useSubmit();
  const baseId = useId();

  const amounts = RESOURCES.map((r) => [r, toInt(cargo[r] ?? "")] as const);
  const total = amounts.reduce((s, [, n]) => s + n, 0);
  const loaded = amounts.filter(([, n]) => n > 0);
  const over = amounts.filter(([r, n]) => n > have[r]);
  const ships = shipsForCargo(total);
  const lackShips = ships > shipsDocked;
  const room = shipsDocked * BALANCE.shipCapacity;

  const label =
    loaded.length === 0
      ? "Mandar recursos"
      : loaded.length === 1
        ? `Mandar ${fmt(loaded[0][1])} de ${RESOURCE_INFO[loaded[0][0]].label.toLowerCase()}`
        : `Mandar ${fmt(total)} de carga`;

  if (shipsDocked === 0) {
    return (
      <p className="rounded-xl bg-parchment-2/70 p-3 text-sm ring-1 ring-parchment-3">
        <strong>No hay barcos en el puerto de {originName}.</strong>{" "}
        <span className="text-ink-soft">Comprá uno en el Puerto o esperá a que vuelvan los que están en el mar.</span>
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!total || lackShips || over.length) return;
        const payload: Record<string, number> = {};
        for (const [r, n] of loaded) payload[r] = n;
        submit(() => transportAction({ originCityId, targetCityId, cargo: payload }), () => setCargo({}));
      }}
    >
      <p className="font-bold">
        Carga desde {originName} a {targetName}
      </p>
      <ul className="flex flex-col gap-1.5">
        {RESOURCES.map((r) => {
          const inputId = `${baseId}-${r}`;
          const n = toInt(cargo[r] ?? "");
          return (
            <li key={r} className="flex items-center gap-2.5">
              <ResIcon kind={r} size={26} />
              <label htmlFor={inputId} className="min-w-0 flex-1 leading-tight">
                <span className="block font-bold">{RESOURCE_INFO[r].label}</span>
                <span className="tabular block text-xs text-ink-soft">Tenés {fmt(have[r])}</span>
              </label>
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="0"
                value={cargo[r] ?? ""}
                onChange={(e) => setCargo((c) => ({ ...c, [r]: digits(e.target.value) }))}
                aria-invalid={n > have[r] || undefined}
                className={clsx(inputClass, "w-24 text-right")}
              />
              <SmallButton
                label={`Cargar el máximo de ${RESOURCE_INFO[r].label.toLowerCase()}`}
                onClick={() => setCargo((c) => ({ ...c, [r]: String(Math.max(0, Math.min(have[r], room - (total - n)))) }))}
              >
                Máx
              </SmallButton>
            </li>
          );
        })}
      </ul>
      <dl className="flex flex-col gap-1 rounded-xl bg-parchment-2/60 p-3 text-sm ring-1 ring-parchment-3">
        <Fact label="Carga">{fmt(total)}</Fact>
        <Fact label="Barcos" warn={lackShips}>
          {fmt(ships)} de {fmt(shipsDocked)} en el puerto
        </Fact>
        <Fact label="Llegan en">{fmtDuration(travelSec * 1000)}</Fact>
      </dl>
      {over.length > 0 && <InlineError>No tenés tanto {RESOURCE_INFO[over[0][0]].label.toLowerCase()} en {originName}.</InlineError>}
      {lackShips && (
        <InlineError>
          Necesitás {fmt(ships)} barcos y tenés {fmt(shipsDocked)}. Cada barco carga {fmt(BALANCE.shipCapacity)}.
        </InlineError>
      )}
      <Button
        type="submit"
        variant={primary ? "primary" : "secondary"}
        disabled={pending || !total || lackShips || over.length > 0}
        aria-busy={pending}
      >
        {pending ? "Cargando barcos…" : label}
      </Button>
      <InlineError>{error}</InlineError>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Colonize a free plot
// ---------------------------------------------------------------------------

export interface Requirement {
  ok: boolean;
  label: string;
  href?: string;
  cta?: string;
}

export function RequirementList({ items }: { items: Requirement[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((r) => (
        <li key={r.label} className="flex items-center gap-2 text-sm">
          <span
            className={clsx(
              "grid size-6 shrink-0 place-items-center rounded-full",
              r.ok ? "bg-success text-marble" : "bg-danger/12 text-danger ring-1 ring-danger/40",
            )}
          >
            {r.ok ? <IconCheck size={14} /> : <IconCross size={14} />}
            <span className="sr-only">{r.ok ? "Cumplido:" : "Falta:"}</span>
          </span>
          <span className={clsx("min-w-0 flex-1", r.ok ? "text-ink-soft" : "font-bold")}>{r.label}</span>
          {!r.ok && r.href && (
            <Link href={r.href} className="shrink-0 rounded-md px-1.5 py-1 font-bold text-bronze-dark underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-bronze-dark">
              {r.cta ?? "Ir"}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ColonizeForm({
  originCityId,
  originName,
  islandId,
  islandName,
  slot,
  requirements,
  travelSec,
}: {
  originCityId: string;
  originName: string;
  islandId: number;
  islandName: string;
  slot: number;
  requirements: Requirement[];
  travelSec: number;
}) {
  const [name, setName] = useState("");
  const { pending, error, submit } = useSubmit();
  const id = useId();
  const clean = name.trim().replace(/\s+/g, " ");
  const nameOk = clean.length >= 3 && clean.length <= 24;
  const ready = requirements.every((r) => r.ok);
  const missing = requirements.filter((r) => !r.ok).length;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || !nameOk) return;
        submit(() => colonizeAction({ originCityId, islandId, slot, name: clean }), () => setName(""));
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="font-bold">
          Nombre de la colonia
        </label>
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={24}
          placeholder={`Nueva ${islandName}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby={`${id}-hint`}
          className={clsx(inputClass, "w-full font-normal")}
        />
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          Entre 3 y 24 letras.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl bg-parchment-2/60 p-3 ring-1 ring-parchment-3">
        <p className="text-sm font-bold">Los colonos salen de {originName}</p>
        <RequirementList items={requirements} />
        <p className="tabular text-sm text-ink-soft">Llegan en {fmtDuration(travelSec * 1000)}.</p>
      </div>
      <Button type="submit" size="lg" disabled={pending || !ready || !nameOk} aria-busy={pending}>
        {pending ? "Zarpando…" : "Fundar colonia acá"}
      </Button>
      {!ready && (
        <p className="text-sm text-ink-soft">
          {missing === 1 ? "Te falta 1 requisito." : `Te faltan ${missing} requisitos.`}
        </p>
      )}
      <InlineError>{error}</InlineError>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Two actions on a rival's plot: one visible at a time
// ---------------------------------------------------------------------------

export function PlotActions({ attack, transport }: { attack: ReactNode; transport: ReactNode }) {
  const [tab, setTab] = useState<"attack" | "transport">("attack");
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Qué querés hacer" className="grid grid-cols-2 gap-1 rounded-xl bg-parchment-2 p-1 ring-1 ring-parchment-3">
        {(
          [
            ["attack", "Atacar"],
            ["transport", "Mandar recursos"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              "h-10 rounded-lg text-[15px] font-bold transition focus-visible:ring-2 focus-visible:ring-bronze-dark",
              tab === key ? "bg-parchment text-ink shadow" : "text-ink-soft hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "attack" ? attack : transport}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Switch the active city from inside a panel (same cookie as the header switcher)
// ---------------------------------------------------------------------------

export function UseCityButton({ cityId, name }: { cityId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        document.cookie = `thalassa_city=${cityId}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      className={buttonClass("secondary", "md", "w-full")}
    >
      {pending ? "Cambiando…" : `Trabajar desde ${name}`}
    </button>
  );
}
