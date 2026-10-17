import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { sql as q } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// DATABASE_URL locally (and with Neon); POSTGRES_URL is what the Supabase integration on Vercel injects.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL no está configurada. Copiá .env.example a .env.local.");

/**
 * TLS as the URL asks for it, without checking the certificate chain: hosted poolers (Supabase) sign
 * with their own CA, and node-postgres reads sslmode=require as "verify". Same behavior the app had
 * with postgres.js.
 */
function poolConfig(raw: string) {
  const parsed = new URL(raw);
  const sslmode = parsed.searchParams.get("sslmode");
  parsed.searchParams.delete("sslmode");
  return {
    connectionString: parsed.toString(),
    ssl: sslmode && sslmode !== "disable" ? { rejectUnauthorized: false } : undefined,
  };
}

/*
  One pool per instance. On Vercel (Fluid compute) the instance is suspended between requests; a
  connection left open through that can come back dead, and a query written to it never answers:
  the page stayed on its loading screen until the 300 s function timeout. So:
  - attachDatabasePool releases idle clients before the instance suspends,
  - query_timeout fails a query that gets no answer in 20 s instead of letting the page hang,
  - idle clients close after 10 s and none lives more than 5 min.
  Hosted databases sit behind a transaction-mode pooler; node-postgres sends unnamed statements, which
  it handles.
*/
const globalForDb = globalThis as unknown as { thalassaPool?: Pool };
const pool =
  globalForDb.thalassaPool ??
  new Pool({
    ...poolConfig(url),
    max: process.env.VERCEL ? 5 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 20_000,
    maxLifetimeSeconds: 300,
    keepAlive: true,
  });
if (!globalForDb.thalassaPool) {
  // An idle client that loses its connection is dropped by the pool; without a listener Node would crash.
  pool.on("error", (err) => console.error("[thalassa] idle database connection closed", err.message));
  attachDatabasePool(pool);
}
if (process.env.NODE_ENV !== "production") globalForDb.thalassaPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };

const SLOW_TX_MS = 5000;

/**
 * db.transaction with limits on the database side, so one stuck request can't hold locks for long and
 * freeze everyone else's page: waiting 5 s for a lock, or running a statement for 15 s, fails that
 * statement. A transaction still open after 5 s is logged with its `label` right away, so it shows
 * up in the logs even if the function dies before finishing.
 */
export async function transaction<T>(label: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const started = Date.now();
  const watchdog = setTimeout(() => console.warn(`[thalassa] transaction "${label}" still open after ${SLOW_TX_MS} ms`), SLOW_TX_MS);
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(q`select set_config('lock_timeout', '5s', true), set_config('statement_timeout', '15s', true)`);
      return fn(tx);
    });
  } finally {
    clearTimeout(watchdog);
    const ms = Date.now() - started;
    if (ms > SLOW_TX_MS) console.warn(`[thalassa] transaction "${label}" took ${ms} ms`);
  }
}

/** Postgres gave up waiting for a lock (lock_timeout). */
export const isLockTimeout = (err: unknown) => {
  for (let e = err; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "55P03") return true;
  }
  return false;
};
