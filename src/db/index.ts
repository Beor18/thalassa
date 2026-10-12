import "server-only";
import { sql as q } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL locally (and with Neon); POSTGRES_URL is what the Supabase integration on Vercel injects.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL no está configurada. Copiá .env.example a .env.local.");

// Reuse one pool across hot reloads in development. Hosted databases sit behind a transaction-mode
// pooler, which can't keep prepared statements; serverless instances keep their pool small and close
// idle connections soon, so a socket left half-open while the instance was frozen isn't reused.
const globalForDb = globalThis as unknown as { thalassaSql?: ReturnType<typeof postgres> };
const sql =
  globalForDb.thalassaSql ??
  postgres(url, {
    max: process.env.VERCEL ? 5 : 10,
    prepare: false,
    idle_timeout: 20,
    max_lifetime: 30 * 60,
    connect_timeout: 10,
  });
if (process.env.NODE_ENV !== "production") globalForDb.thalassaSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };

const SLOW_TX_MS = 5000;

/**
 * db.transaction with guards on the database side, so one stuck request can't hold locks for
 * minutes and freeze everyone else's page (it happened in production: a transaction left idle until
 * the function timed out at 300 s, while other requests queued behind its lock):
 * - waiting 5 s for a lock, or running a statement for 15 s: that statement fails (the connection
 *   stays fine),
 * - idle for 30 s inside the transaction: Postgres ends the session and frees its locks. Last
 *   resort only: postgres.js 3.4.9 can crash the process when the server drops a session it still
 *   writes to, and by then that request is stuck anyway.
 * A transaction still open after 5 s is logged with its `label` right away, so it shows up in the
 * logs even if the function dies before finishing.
 */
export async function transaction<T>(label: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const started = Date.now();
  const watchdog = setTimeout(() => console.warn(`[thalassa] transaction "${label}" still open after ${SLOW_TX_MS} ms`), SLOW_TX_MS);
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(
        q`select set_config('lock_timeout', '5s', true), set_config('statement_timeout', '15s', true), set_config('idle_in_transaction_session_timeout', '30s', true)`,
      );
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
