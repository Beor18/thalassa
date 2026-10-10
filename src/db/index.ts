import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no está configurada. Copiá .env.example a .env.local.");

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { thalassaSql?: ReturnType<typeof postgres> };
const sql = globalForDb.thalassaSql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.thalassaSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
