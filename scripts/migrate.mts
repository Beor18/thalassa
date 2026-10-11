// Applies pending migrations from ./drizzle. Runs before every Vercel build (pnpm vercel-build),
// so a deploy never ships code ahead of its schema. Prefers the direct (unpooled) connection.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {
  // On Vercel the variables come from the project settings.
}

const env = process.env;
const url = env.POSTGRES_URL_NON_POOLING ?? env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL ?? env.POSTGRES_URL;
if (!url) {
  console.error("migrate: no database URL (DATABASE_URL or POSTGRES_URL).");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
await sql.end();
console.log("migrate: schema up to date");
