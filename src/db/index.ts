import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL locally (and with Neon); POSTGRES_URL is what the Supabase integration on Vercel injects.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL no está configurada. Copiá .env.example a .env.local.");

// Reuse one pool across hot reloads in development. Hosted databases sit behind a transaction-mode
// pooler, which can't keep prepared statements; serverless instances keep their pool small.
const globalForDb = globalThis as unknown as { thalassaSql?: ReturnType<typeof postgres> };
const sql = globalForDb.thalassaSql ?? postgres(url, { max: process.env.VERCEL ? 5 : 10, prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.thalassaSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
