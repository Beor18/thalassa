"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { BALANCE, RESOURCES, UNITS, type Resource, type UnitBag, type UnitType } from "@/game/data";
import { resolveCombat, shipsForCargo, shipsForUnits } from "@/game/engine";
import { attackAction, colonizeAction, donateAction, setWorkersAction, transportAction } from "@/server/actions";
import type { ActionResult } from "@/lib/action-result";
import { Button, buttonClass } from "@/components/ui/button";
import { reportResult } from "@/components/ui/action-button";
import { ResIcon } from "@/components/ui/res";
import { resourceLabel, unitName } from "@/game/names";
import { useI18n } from "@/i18n/client";
import { UnitPortrait } from "@/components/military/units";
import { IconBox, IconCheck, IconClock, IconCross, IconShield, IconSwords } from "./icons";
import { useClosePanel } from "./panel-host";
import { Callout, ResGlyph, ShipGlyph, Stat, StatRow } from "./ui";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const inputClass =
  "h-10 rounded-lg border border-parchment-3 bg-marble px-2.5 text-ink tabular font-bold placeholder:font-normal placeholder:text-ink-soft/80 focus-visible:ring-2 focus-visible:ring-bronze-dark aria-[invalid=true]:border-danger";

const digits = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 9);
const toInt = (v: string) => (v ? Number.parseInt(v, 10) || 0 : 0);
/** "1 ship", "12 ships": the number in the player's format, the noun by count. */
const plural = (fmt: (n: number) => string, n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

/** `inline`: the form confirms success itself, so no toast lands on top of its next button. */
function useSubmit({ inline = false }: { inline?: boolean } = {}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (run: () => Promise<ActionResult<unknown>>, onOk?: () => void) => {
    setError(null);
    start(async () => {
      const result = await run();
      if (!(inline && result.ok)) reportResult(result);
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
  goldPerHour,
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
  /** this city's gold balance per hour right now (taxes minus upkeep) */
  goldPerHour: number;
}) {
  // Nobody working yet: suggest half of the free citizens so the first click already does something useful.
  const { t, lang, fmt, fmtSigned } = useI18n();
  const [value, setValue] = useState(() => (current === 0 ? Math.min(max, Math.floor(free / 2)) : current));
  const { pending, error, submit } = useSubmit({ inline: true });
  const close = useClosePanel();
  // Set once the server confirms: the form then says what changed and offers to close.
  const [saved, setSaved] = useState(false);
  const rangeId = useId();
  const res = resourceLabel(resource, lang);
  const label = res.toLowerCase();
  const workers = (n: number) => (lang === "en" ? plural(fmt, n, "worker", "workers") : plural(fmt, n, "trabajador", "trabajadores"));
  const delta = value - current;
  const goldAfter = goldPerHour - delta * goldPerCitizen;
  const done = saved && delta === 0 && !pending;
  const set = (n: number) => setValue(Math.max(0, Math.min(max, n)));

  const submitLabel =
    value === 0
      ? current === 0
        ? t({ en: "Assign workers", es: "Asignar trabajadores" })
        : t({ en: "Remove all workers", es: "Sacar a todos los trabajadores" })
      : t({ en: `Assign ${workers(value)}`, es: `Asignar ${workers(value)}` });

  if (max === 0) {
    return (
      <Callout title={t({ en: "No idle citizens", es: "Sin ciudadanos libres" })}>
        {t({ en: "Upgrade the Town Hall to grow your population.", es: "Subí la Intendencia para que crezca la población." })}
      </Callout>
    );
  }

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(() => setWorkersAction({ cityId, [field]: value }), () => setSaved(true));
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={rangeId} className="font-bold">
          {t({ en: "Workers", es: "Trabajadores" })}
        </label>
        <span className="tabular text-sm text-ink-soft">
          {t({ en: `Now ${fmt(current)} · max ${fmt(capacity)}`, es: `Ahora ${fmt(current)} · máx ${fmt(capacity)}` })}
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
          aria-valuetext={workers(value)}
          className="h-10 min-w-0 flex-1 cursor-pointer accent-bronze"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={t({ en: "Number of workers", es: "Cantidad de trabajadores" })}
          value={String(value)}
          onChange={(e) => set(toInt(digits(e.target.value)))}
          className={clsx(inputClass, "w-20 text-right")}
        />
      </div>
      <StatRow>
        <Stat
          icon={<ResGlyph kind={resource} />}
          label={t({ en: `${res} output`, es: `Producción de ${label}` })}
          hint={t({ en: `${fmt(perWorker)} per worker`, es: `${fmt(perWorker)} por trabajador` })}
          tone={value > 0 ? "good" : "muted"}
        >
          +{fmt(value * perWorker)}/h
        </Stat>
        {/* The trade-off, calmly: what this city keeps earning in gold, not what it "loses". */}
        <Stat
          icon={<ResGlyph kind="gold" />}
          label={t({ en: "This city's gold per hour", es: "Oro por hora de esta ciudad" })}
          hint={t({ en: "Workers pay no taxes", es: "Quien trabaja no paga impuestos" })}
          tone={goldAfter < 0 ? "bad" : "muted"}
        >
          {delta !== 0 && <span className="font-semibold text-ink-soft/80">{fmtSigned(goldPerHour)} →</span>}
          {fmtSigned(goldAfter)}/h
        </Stat>
      </StatRow>
      {done ? (
        <>
          <p role="status" className="flex items-center gap-2 rounded-xl bg-success/12 px-3 py-2 text-sm font-bold text-success">
            <IconCheck size={18} className="shrink-0" />
            {current === 0
              ? t({ en: "Nobody works here now", es: "Nadie trabaja acá ahora" })
              : t({
                  en: `${workers(current)}: +${fmt(current * perWorker)} ${label} per hour`,
                  es: `${workers(current)}: +${fmt(current * perWorker)} de ${label} por hora`,
                })}
          </p>
          <Button type="button" onClick={close}>
            {t({ en: "Back to the island", es: "Volver a la isla" })}
          </Button>
        </>
      ) : (
        <Button type="submit" disabled={pending || delta === 0} aria-busy={pending}>
          {pending ? t({ en: "Assigning…", es: "Asignando…" }) : submitLabel}
        </Button>
      )}
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
}: {
  cityId: string;
  target: "sawmill" | "mine";
  have: number;
  remaining: number;
}) {
  const { t, fmt } = useI18n();
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
      <div className="flex flex-wrap items-center gap-1">
        <span className="relative">
          <label htmlFor={id} className="sr-only">
            {t({ en: "Wood to donate", es: "Madera a donar" })}
          </label>
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2">
            <ResGlyph kind="wood" />
          </span>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder={fmt(Math.max(1, Math.min(500, remaining || 500)))}
            value={amount}
            onChange={(e) => setAmount(digits(e.target.value))}
            aria-invalid={tooMuch || undefined}
            aria-describedby={tooMuch ? `${id}-err` : undefined}
            className={clsx(inputClass, "w-28 pl-9")}
          />
        </span>
        {presets.map((p) => (
          <SmallButton key={p} onClick={() => setAmount(String(p))}>
            {fmt(p)}
          </SmallButton>
        ))}
        {remaining > 0 && remaining <= have && (
          <SmallButton onClick={() => setAmount(String(remaining))}>{t({ en: "What's left", es: "Lo que falta" })}</SmallButton>
        )}
      </div>
      {tooMuch && (
        <InlineError id={`${id}-err`}>{t({ en: `You have ${fmt(have)} wood.`, es: `Tenés ${fmt(have)} de madera.` })}</InlineError>
      )}
      <Button type="submit" variant="secondary" disabled={pending || n < 1 || tooMuch} aria-busy={pending}>
        {pending
          ? t({ en: "Donating…", es: "Donando…" })
          : n > 0
            ? t({ en: `Donate ${fmt(n)} wood`, es: `Donar ${fmt(n)} de madera` })
            : t({ en: "Donate wood", es: "Donar madera" })}
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
  trainHref,
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
  /** the Cuartel of the origin city, offered when the forecast is a defeat */
  trainHref?: string;
}) {
  const { t, lang, fmt, fmtDuration } = useI18n();
  const [counts, setCounts] = useState<Partial<Record<UnitType, string>>>({});
  const { pending, error, submit } = useSubmit();
  const errId = useId();
  const shipsText = (n: number) => (lang === "en" ? plural(fmt, n, "ship", "ships") : plural(fmt, n, "barco", "barcos"));

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
  const defense = defender ? (preview ?? resolveCombat({}, defender.units, defender.wall)).defensePower : null;
  const lost = preview ? Object.values(preview.attackerLosses).reduce((s, n) => s + (n ?? 0), 0) : 0;
  // A defeat is not a button away: say it loud and make attacking anyway the quiet option.
  const losing = Boolean(preview && !preview.attackerWins);

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
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!total || lackShips || blocked) return;
        submit(() => attackAction({ originCityId, target, units }), () => setCounts({}));
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-bold">
          {t({ en: "Troops", es: "Tropas" })}{" "}
          <span className="font-normal text-ink-soft">{t({ en: `from ${originName}`, es: `de ${originName}` })}</span>
        </p>
        <SmallButton onClick={fillAll} disabled={shipsDocked === 0} label={t({ en: "Pick all troops", es: "Elegir todas las tropas" })}>
          {t({ en: "All", es: "Todas" })}
        </SmallButton>
      </div>
      <ul className="flex flex-col gap-1.5">
        {available.map((u) => {
          const def = UNITS[u.type];
          const name = unitName(u.type, lang);
          const inputId = `${errId}-${u.type}`;
          const value = counts[u.type] ?? "";
          const over = toInt(value) > u.have;
          return (
            <li key={u.type} className="flex items-center gap-2 rounded-xl bg-parchment-2/60 py-1 pr-1 pl-1 ring-1 ring-parchment-3">
              <UnitPortrait unit={u.type} size={40} className="bg-transparent" />
              <label htmlFor={inputId} className="min-w-0 flex-1 leading-tight">
                <span className="block truncate font-bold">{name}</span>
                <span className="tabular flex items-center gap-1.5 text-xs text-ink-soft">
                  {t({ en: `${fmt(u.have)} at home`, es: `${fmt(u.have)} en casa` })}
                  <span className="inline-flex items-center gap-0.5" title={t({ en: "Attack per soldier", es: "Ataque por soldado" })}>
                    <IconSwords size={12} />
                    <span className="sr-only">{t({ en: "attack", es: "ataque" })}</span>
                    {def.attack}
                  </span>
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
                className={clsx(inputClass, "w-[4.5rem] text-right")}
              />
              <SmallButton
                label={t({ en: `Use all (${name})`, es: `Usar todos (${name})` })}
                onClick={() => setCounts((c) => ({ ...c, [u.type]: String(u.have) }))}
              >
                {t({ en: "Max", es: "Máx" })}
              </SmallButton>
            </li>
          );
        })}
      </ul>

      <StatRow>
        <Stat
          icon={<IconSwords size={16} />}
          label={t({ en: "Your attack strength", es: "Tu fuerza de ataque" })}
          tone={preview ? (preview.attackerWins ? "good" : "bad") : "default"}
        >
          {fmt(attack)}
        </Stat>
        {defense !== null ? (
          <Stat icon={<IconShield size={16} />} label={t({ en: "Enemy defense", es: "Defensa enemiga" })}>
            {fmt(defense)}
          </Stat>
        ) : (
          <Stat
            icon={<IconShield size={16} />}
            label={t({ en: "Enemy defense", es: "Defensa enemiga" })}
            hint={t({ en: "Unknown. When in doubt, send more", es: "No se conoce. Si dudás, mandá de más" })}
            tone="muted"
          >
            ?
          </Stat>
        )}
        <Stat
          icon={<ShipGlyph />}
          label={t({ en: "Ships used of those in port", es: "Barcos que usás de los que hay en el puerto" })}
          tone={lackShips ? "bad" : "default"}
        >
          {fmt(ships)}/{fmt(shipsDocked)}
        </Stat>
        <Stat icon={<IconClock size={16} />} label={t({ en: "Arrive in", es: "Llegan en" })} tone="muted">
          {fmtDuration(travelSec * 1000)}
        </Stat>
        {preview && preview.attackerWins && (
          <Stat
            icon={<IconBox size={16} />}
            label={t({ en: "Max loot", es: "Botín máximo" })}
            hint={t({ en: `${fmt(BALANCE.shipCapacity)} per ship`, es: `${fmt(BALANCE.shipCapacity)} por barco` })}
            tone="muted"
          >
            {fmt(ships * BALANCE.shipCapacity)}
          </Stat>
        )}
      </StatRow>

      {preview && preview.attackerWins && (
        <p className="rounded-xl bg-success/12 px-3 py-2 text-sm font-bold text-success">
          {lost > 0
            ? t({ en: `You win · lose about ${fmt(lost)}`, es: `Ganás · perdés unos ${fmt(lost)}` })
            : t({ en: "You win with no losses", es: "Ganás sin bajas" })}
        </p>
      )}
      {preview && losing && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border-2 border-danger/45 bg-danger/10 p-3">
          <p className="font-display text-base leading-tight font-bold text-danger">
            {t({ en: "This force loses", es: "Con esta fuerza perdés" })}
          </p>
          {lang === "en" ? (
            <p className="text-sm text-ink">
              About <strong className="tabular">{fmt(lost)}</strong> of your {fmt(total)} soldiers would fall, and no loot.
            </p>
          ) : (
            <p className="text-sm text-ink">
              Caerían unos <strong className="tabular">{fmt(lost)}</strong> de tus {fmt(total)} soldados, sin botín.
            </p>
          )}
          {trainHref && (
            <Link href={trainHref} className={buttonClass("primary", "md", "w-full")}>
              {t({ en: "Train more troops", es: "Entrenar más tropas" })}
            </Link>
          )}
        </div>
      )}

      {lackShips && (
        <InlineError>
          {t({
            en: `You need ${shipsText(ships)} and have ${fmt(shipsDocked)}. Each carries ${BALANCE.unitsPerShip}.`,
            es: `Necesitás ${shipsText(ships)} y hay ${fmt(shipsDocked)}. Cada uno lleva ${BALANCE.unitsPerShip}.`,
          })}
        </InlineError>
      )}
      {blocked && <p className="rounded-xl bg-parchment-2 px-3 py-2 text-sm font-bold text-ink-soft">{blocked}</p>}

      <Button
        type="submit"
        size={losing ? "md" : "lg"}
        variant={losing ? "secondary" : "primary"}
        disabled={pending || !total || lackShips || Boolean(blocked)}
        aria-busy={pending}
      >
        {pending
          ? t({ en: "Setting sail…", es: "Zarpando…" })
          : losing
            ? t({ en: "Attack anyway", es: "Atacar igual" })
            : total > 0
              ? t({ en: `Attack with ${plural(fmt, total, "soldier", "soldiers")}`, es: `Atacar con ${plural(fmt, total, "soldado", "soldados")}` })
              : submitLabel}
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
  have,
  shipsDocked,
  travelSec,
  primary = true,
}: {
  originCityId: string;
  originName: string;
  targetCityId: string;
  have: Record<Resource, number>;
  shipsDocked: number;
  travelSec: number;
  primary?: boolean;
}) {
  const { t, lang, fmt, fmtDuration } = useI18n();
  const [cargo, setCargo] = useState<Partial<Record<Resource, string>>>({});
  const { pending, error, submit } = useSubmit();
  const baseId = useId();
  const shipsText = (n: number) => (lang === "en" ? plural(fmt, n, "ship", "ships") : plural(fmt, n, "barco", "barcos"));

  const amounts = RESOURCES.map((r) => [r, toInt(cargo[r] ?? "")] as const);
  const total = amounts.reduce((s, [, n]) => s + n, 0);
  const loaded = amounts.filter(([, n]) => n > 0);
  const over = amounts.filter(([r, n]) => n > have[r]);
  const ships = shipsForCargo(total);
  const lackShips = ships > shipsDocked;
  const room = shipsDocked * BALANCE.shipCapacity;

  if (shipsDocked === 0) {
    return (
      <Callout title={t({ en: `No ships in ${originName}`, es: `Sin barcos en ${originName}` })}>
        {t({ en: "Buy one at the Port or wait for yours to return.", es: "Comprá uno en el Puerto o esperá a que vuelvan." })}
      </Callout>
    );
  }

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!total || lackShips || over.length) return;
        const payload: Record<string, number> = {};
        for (const [r, n] of loaded) payload[r] = n;
        submit(() => transportAction({ originCityId, targetCityId, cargo: payload }), () => setCargo({}));
      }}
    >
      <p className="min-w-0 truncate font-bold">
        {t({ en: "Cargo", es: "Carga" })}{" "}
        <span className="font-normal text-ink-soft">{t({ en: `from ${originName}`, es: `de ${originName}` })}</span>
      </p>
      <ul className="flex flex-col gap-1">
        {RESOURCES.map((r) => {
          const inputId = `${baseId}-${r}`;
          const n = toInt(cargo[r] ?? "");
          return (
            <li key={r} className="flex items-center gap-2">
              <label htmlFor={inputId} className="flex min-w-0 flex-1 items-center gap-2">
                <ResIcon kind={r} size={26} />
                <span className="tabular text-sm text-ink-soft">
                  <span className="sr-only">{t({ en: ", you have ", es: ", tenés " })}</span>
                  {fmt(have[r])}
                </span>
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
                label={t({
                  en: `Load max ${resourceLabel(r, lang).toLowerCase()}`,
                  es: `Cargar el máximo de ${resourceLabel(r, lang).toLowerCase()}`,
                })}
                onClick={() => setCargo((c) => ({ ...c, [r]: String(Math.max(0, Math.min(have[r], room - (total - n)))) }))}
              >
                {t({ en: "Max", es: "Máx" })}
              </SmallButton>
            </li>
          );
        })}
      </ul>
      <StatRow>
        <Stat icon={<IconBox size={16} />} label={t({ en: "Cargo and room on the ships in port", es: "Carga y lugar en los barcos del puerto" })}>
          {fmt(total)}/{fmt(room)}
        </Stat>
        <Stat
          icon={<ShipGlyph />}
          label={t({ en: "Ships used of those in port", es: "Barcos que usás de los que hay en el puerto" })}
          tone={lackShips ? "bad" : "default"}
        >
          {fmt(ships)}/{fmt(shipsDocked)}
        </Stat>
        <Stat icon={<IconClock size={16} />} label={t({ en: "Arrive in", es: "Llegan en" })} tone="muted">
          {fmtDuration(travelSec * 1000)}
        </Stat>
      </StatRow>
      {over.length > 0 && (
        <InlineError>
          {t({
            en: `Not enough ${resourceLabel(over[0][0], lang).toLowerCase()}.`,
            es: `No tenés tanto ${resourceLabel(over[0][0], lang).toLowerCase()}.`,
          })}
        </InlineError>
      )}
      {lackShips && (
        <InlineError>
          {t({
            en: `You need ${shipsText(ships)} and have ${fmt(shipsDocked)}. Each holds ${fmt(BALANCE.shipCapacity)}.`,
            es: `Necesitás ${shipsText(ships)} y hay ${fmt(shipsDocked)}. Cada uno carga ${fmt(BALANCE.shipCapacity)}.`,
          })}
        </InlineError>
      )}
      <Button
        type="submit"
        variant={primary ? "primary" : "secondary"}
        disabled={pending || !total || lackShips || over.length > 0}
        aria-busy={pending}
      >
        {pending
          ? t({ en: "Loading ships…", es: "Cargando barcos…" })
          : total > 0
            ? t({ en: `Send ${shipsText(ships)}`, es: `Enviar ${shipsText(ships)}` })
            : t({ en: "Pick what to send", es: "Elegí qué mandar" })}
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
  /** short link text on the row */
  cta?: string;
  /** full button text when this is the next thing to do */
  action?: string;
}

/** `primary`: the step shown as the big button below, so its row doesn't repeat the link. */
export function RequirementList({ items, primary }: { items: Requirement[]; primary?: Requirement }) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((r) => (
        <li key={r.label} className="flex min-h-8 items-center gap-2 text-sm">
          <span
            className={clsx(
              "grid size-6 shrink-0 place-items-center rounded-full",
              r.ok ? "bg-success text-marble" : "bg-danger/12 text-danger ring-1 ring-danger/40",
            )}
          >
            {r.ok ? <IconCheck size={14} /> : <IconCross size={14} />}
            <span className="sr-only">{r.ok ? t({ en: "Done:", es: "Cumplido:" }) : t({ en: "Needed:", es: "Falta:" })}</span>
          </span>
          <span className={clsx("min-w-0 flex-1", r.ok ? "text-ink-soft" : "font-bold")}>{r.label}</span>
          {!r.ok && r.href && r !== primary && (
            <Link
              href={r.href}
              className="shrink-0 rounded-md px-1.5 py-1 font-bold text-bronze-dark underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-bronze-dark"
            >
              {r.cta ?? t({ en: "Go", es: "Ir" })}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ColonizeForm({
  originCityId,
  islandId,
  islandName,
  slot,
  steps,
  costOk,
}: {
  originCityId: string;
  islandId: number;
  islandName: string;
  slot: number;
  /** what has to be in place besides the cost (research, palace, a ship) */
  steps: Requirement[];
  /** wood, gold and citizens are enough */
  costOk: boolean;
}) {
  const { t } = useI18n();
  const fallback = t({ en: `New ${islandName}`, es: `Nueva ${islandName}` }).slice(0, 24).trim();
  const [name, setName] = useState("");
  const { pending, error, submit } = useSubmit();
  const id = useId();
  const clean = name.trim().replace(/\s+/g, " ") || fallback;
  const nameOk = clean.length >= 3 && clean.length <= 24;
  const ready = costOk && steps.every((r) => r.ok);
  // Not ready: the first thing to fix becomes the big button.
  const next = steps.find((r) => !r.ok && r.href);

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || !nameOk) return;
        submit(() => colonizeAction({ originCityId, islandId, slot, name: clean }), () => setName(""));
      }}
    >
      {/* All set: the checklist would only be noise. */}
      {steps.some((r) => !r.ok) && <RequirementList items={steps} primary={ready ? undefined : next} />}
      {ready ? (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor={id} className="shrink-0 font-bold">
              {t({ en: "Name", es: "Nombre" })}
            </label>
            <input
              id={id}
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              placeholder={fallback}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!nameOk || undefined}
              className={clsx(inputClass, "min-w-0 flex-1 font-normal")}
            />
          </div>
          {!nameOk && <InlineError>{t({ en: "3 to 24 characters.", es: "Entre 3 y 24 letras." })}</InlineError>}
          <Button type="submit" size="lg" disabled={pending || !nameOk} aria-busy={pending}>
            {pending ? t({ en: "Setting sail…", es: "Zarpando…" }) : t({ en: "Found colony", es: "Fundar colonia" })}
          </Button>
        </>
      ) : next ? (
        <Link href={next.href!} className={buttonClass("primary", "lg", "w-full")}>
          {next.action ?? next.cta}
        </Link>
      ) : (
        <Button type="button" size="lg" disabled>
          {t({ en: "Not enough resources", es: "Faltan recursos" })}
        </Button>
      )}
      <InlineError>{error}</InlineError>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Two actions on a rival's plot: one visible at a time
// ---------------------------------------------------------------------------

export function PlotActions({ attack, transport }: { attack: ReactNode; transport: ReactNode }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"attack" | "transport">("attack");
  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label={t({ en: "What do you want to do", es: "Qué querés hacer" })}
        className="grid grid-cols-2 gap-1 rounded-xl bg-parchment-2 p-1 ring-1 ring-parchment-3"
      >
        {(
          [
            ["attack", t({ en: "Attack", es: "Atacar" }), <IconSwords key="i" size={16} />],
            ["transport", t({ en: "Send resources", es: "Mandar recursos" }), <IconBox key="i" size={16} />],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-[15px] font-bold transition focus-visible:ring-2 focus-visible:ring-bronze-dark",
              tab === key ? "bg-parchment text-ink shadow" : "text-ink-soft hover:text-ink",
            )}
          >
            {icon}
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
  const { t } = useI18n();
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
      {pending ? t({ en: "Switching…", es: "Cambiando…" }) : t({ en: `Work from ${name}`, es: `Trabajar desde ${name}` })}
    </button>
  );
}
