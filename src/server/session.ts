import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "thalassa_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET falta o es muy corta (mínimo 32 caracteres).");
  return new TextEncoder().encode(secret);
}

export interface Session {
  playerId: string;
  wallet: string;
}

export async function createSession(session: Session) {
  const token = await new SignJWT({ wallet: session.wallet })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.playerId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.wallet !== "string") return null;
    return { playerId: payload.sub, wallet: payload.wallet };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
