// Funnel, retention and money for the last N days, straight from Postgres (first-party events + ledger).
// Usage: pnpm metrics [days=7] [--sol-usd 150]
process.loadEnvFile(".env.local");

const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");

const args = process.argv.slice(2);
const solIdx = args.indexOf("--sol-usd");
const solUsd = solIdx >= 0 ? Number(args.splice(solIdx, 2)[1]) : null;
const days = Math.max(1, Math.min(365, Number(args[0] ?? 7) || 7));
const since = new Date(Date.now() - days * 86_400_000);
const sinceIso = since.toISOString();

/** ambrosía per pack and its price on devnet (onchain/README.md) */
const AMBROSIA_PER_PACK = 100;
const SOL_PER_PACK = 0.05;

type Row = Record<string, unknown>;
const rows = async (q: ReturnType<typeof sql>) => (await db.execute(q)) as unknown as Row[];
const one = async (q: ReturnType<typeof sql>) => (await rows(q))[0] ?? {};
const n = (v: unknown) => Number(v ?? 0);
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "–");
const pad = (s: string, w: number) => s.padEnd(w);
const num = (v: number) => v.toLocaleString("es-AR");

// --- Visits (client beacons, unique per tab id) -------------------------------------------
const visits = await one(sql`
  select
    count(distinct sid) filter (where name = 'landing_view') as landing,
    count(distinct sid) filter (where name = 'play_click') as play,
    count(distinct sid) filter (where name = 'wallet_choose') as wallet,
    count(distinct sid) filter (where name = 'polis_view') as polis_view,
    count(distinct sid) filter (where name = 'polis_cta_click') as polis_cta
  from analytics_events where created_at >= ${sinceIso}::timestamptz`);

// --- New accounts in the window and how far they got (cohort funnel) -----------------------
const cohort = await one(sql`
  with c as (select id from players where created_at >= ${sinceIso}::timestamptz)
  select
    (select count(*) from c) as created,
    (select count(*) from c where exists (select 1 from analytics_events a where a.player_id = c.id and a.name = 'first_build_started')) as built,
    (select count(*) from c where exists (select 1 from analytics_events a where a.player_id = c.id and a.name = 'first_research')) as researched,
    (select count(*) from c where exists (select 1 from analytics_events a where a.player_id = c.id and a.name = 'first_attack_sent')) as attacked,
    (select count(*) from c where exists (select 1 from analytics_events a where a.player_id = c.id and a.name = 'faucet_claimed')) as faucet,
    (select count(*) from c where exists (select 1 from ambrosia_ledger l where l.player_id = c.id and l.reason = 'onchain:buy_ambrosia')) as bought,
    (select count(*) from c where exists (select 1 from referrals r where r.invitee_id = c.id)) as invited`);

const logins = await one(sql`
  select
    count(*) filter (where props->>'new' = 'true') as new_logins,
    count(*) filter (where props->>'new' = 'false') as returning_logins
  from analytics_events where name = 'login_success' and created_at >= ${sinceIso}::timestamptz`);

// --- Retention: classic Dn over accounts created in the window -----------------------------
const retention = await one(sql`
  with c as (
    select id, (created_at at time zone 'utc')::date as d0 from players where created_at >= ${sinceIso}::timestamptz
  ), today as (select (now() at time zone 'utc')::date as d)
  select
    ${sql.raw(
      [1, 7, 30]
        .map(
          (k) => `
    count(*) filter (where c.d0 <= (select d from today) - ${k}) as e${k},
    count(*) filter (where c.d0 <= (select d from today) - ${k} and exists (
      select 1 from analytics_events a
      where a.player_id = c.id and a.name = 'active_day' and (a.props->>'day')::date = c.d0 + ${k})) as r${k}`,
        )
        .join(","),
    )}
  from c`);

// --- Activity -----------------------------------------------------------------------------
const activity = await one(sql`
  select
    count(distinct player_id) filter (where props->>'day' = to_char(now() at time zone 'utc', 'YYYY-MM-DD')) as dau_today,
    count(distinct player_id) as active_players,
    count(*)::float / greatest(1, count(distinct props->>'day')) as avg_dau
  from analytics_events where name = 'active_day' and created_at >= ${sinceIso}::timestamptz and player_id is not null`);

// --- Money (ambrosía ledger) ----------------------------------------------------------------
const money = await one(sql`
  select
    coalesce(sum(delta) filter (where reason = 'onchain:buy_ambrosia'), 0) as bought,
    count(*) filter (where reason = 'onchain:buy_ambrosia') as purchases,
    count(distinct player_id) filter (where reason = 'onchain:buy_ambrosia') as buyers,
    coalesce(sum(delta) filter (where reason = 'referral'), 0) as referral_given,
    coalesce(-sum(delta) filter (where delta < 0), 0) as spent
  from ambrosia_ledger where created_at >= ${sinceIso}::timestamptz`);
const spentBy = await rows(sql`
  select split_part(reason, ':', 1) || coalesce(':' || nullif(split_part(reason, ':', 2), ''), '') as reason, -sum(delta) as amount
  from ambrosia_ledger where created_at >= ${sinceIso}::timestamptz and delta < 0
  group by 1 order by 2 desc limit 8`);

// --- Invites --------------------------------------------------------------------------------
const invites = await one(sql`
  select
    (select count(*) from analytics_events where name = 'invite_open' and created_at >= ${sinceIso}::timestamptz) as opened,
    (select count(*) from referrals where created_at >= ${sinceIso}::timestamptz) as linked,
    (select count(*) from referrals where rewarded_at >= ${sinceIso}::timestamptz) as rewarded,
    (select count(*) from analytics_events where name in ('invite_copy', 'invite_share') and created_at >= ${sinceIso}::timestamptz) as shared`);

// --- Sources --------------------------------------------------------------------------------
const sources = await rows(sql`
  select coalesce(props->>'utm_source', props->>'from', '(directo)') as source, count(distinct sid) as visits
  from analytics_events where name = 'landing_view' and created_at >= ${sinceIso}::timestamptz
  group by 1 order by 2 desc limit 10`);

// --- Print ----------------------------------------------------------------------------------
const created = n(cohort.created);
const landing = n(visits.landing);
const line = (label: string, value: number | string, note = "") =>
  console.log(`  ${pad(label, 34)}${pad(typeof value === "number" ? num(value) : value, 10)}${note}`);

console.log(`\nThalassa · últimos ${days} días (desde ${since.toISOString().slice(0, 10)})\n`);
console.log("Embudo de la portada (visitas únicas por pestaña)");
line("Vieron la portada", landing);
line("Tocaron Jugar ahora", n(visits.play), pct(n(visits.play), landing) + " de las visitas");
line("Abrieron Entrar con billetera", n(visits.wallet), pct(n(visits.wallet), landing) + " de las visitas");
line("Cuentas nuevas", created, pct(created, landing) + " de las visitas");
console.log("\nPrimeros pasos de las cuentas nuevas (cohorte)");
line("Empezaron una obra", n(cohort.built), pct(n(cohort.built), created));
line("Investigaron algo", n(cohort.researched), pct(n(cohort.researched), created));
line("Mandaron un ataque", n(cohort.attacked), pct(n(cohort.attacked), created));
line("Pidieron SOL de prueba", n(cohort.faucet), pct(n(cohort.faucet), created));
line("Compraron ambrosía", n(cohort.bought), pct(n(cohort.bought), created));
line("Llegaron invitados", n(cohort.invited), pct(n(cohort.invited), created));
console.log(`  Ingresos: ${num(n(logins.new_logins))} cuentas nuevas, ${num(n(logins.returning_logins))} regresos con firma`);

console.log("\nRetención (cohorte de la ventana, días UTC)");
for (const k of [1, 7, 30]) {
  const e = n(retention[`e${k}`]);
  const r = n(retention[`r${k}`]);
  line(`D${k}`, r, e ? `${pct(r, e)} de ${num(e)} cuentas con edad suficiente` : "todavía no hay cuentas con esa edad");
}

console.log("\nActividad");
line("Jugadores activos hoy", n(activity.dau_today));
line("Promedio diario (DAU)", Math.round(n(activity.avg_dau)));
line("Activos en la ventana", n(activity.active_players));

const bought = n(money.bought);
const buyers = n(money.buyers);
const sol = (bought / AMBROSIA_PER_PACK) * SOL_PER_PACK;
const usd = (v: number) => (solUsd ? ` (≈ US$ ${(v * solUsd).toFixed(2)})` : "");
console.log("\nAmbrosía (precio de red de prueba: 100 = 0,05 SOL)");
line("Ambrosía comprada", bought, `${num(n(money.purchases))} compras · ${sol.toFixed(3)} SOL${usd(sol)}`);
line("Compradores", buyers, `${pct(buyers, n(activity.active_players))} de los activos`);
line("ARPPU", buyers ? `${(sol / buyers).toFixed(3)} SOL` : "–", buyers ? `por comprador${usd(sol / buyers)}` : "");
line("Ambrosía regalada por invitar", n(money.referral_given));
line("Ambrosía gastada", n(money.spent));
for (const r of spentBy) console.log(`    ${pad(String(r.reason), 32)}${num(n(r.amount))}`);

console.log("\nInvitaciones");
line("Links abiertos", n(invites.opened));
line("Cuentas vinculadas", n(invites.linked), pct(n(invites.linked), n(invites.opened)) + " de los links abiertos");
line("Premios pagados", n(invites.rewarded));
line("Veces que copiaron o compartieron", n(invites.shared));
line("Visitas a polis públicas", n(visits.polis_view), `${num(n(visits.polis_cta))} tocaron Fundá tu polis`);

console.log("\nDe dónde llegan (visitas a la portada)");
if (!sources.length) console.log("  Sin visitas registradas todavía.");
for (const s of sources) console.log(`  ${pad(String(s.source), 34)}${num(n(s.visits))}`);
console.log("");
process.exit(0);
