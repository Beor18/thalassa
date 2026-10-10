// Dev helper: creates (or reuses) a player for a wallet and prints a session cookie.
// Usage: pnpm dev:session [walletAddress]
//   curl -H "Cookie: $(pnpm -s dev:session)" http://localhost:3000/ciudad
import { SignJWT } from "jose";
import { generateKeyPairSigner } from "@solana/kit";

process.loadEnvFile(".env.local");

const { findOrCreatePlayer } = await import("../src/server/world");
const wallet = process.argv[2] ?? (await generateKeyPairSigner()).address;
const { id } = await findOrCreatePlayer(wallet);
const token = await new SignJWT({ wallet })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(id)
  .setIssuedAt()
  .setExpirationTime("7d")
  .sign(new TextEncoder().encode(process.env.SESSION_SECRET!));
console.log(`thalassa_session=${token}`);
process.exit(0);
