// Sign in with Solana: ask the server for a one-time message, sign it, trade the signature for a session.
import { getBase58Decoder } from "@solana/kit";
import { FriendlyError } from "./client";

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new FriendlyError("No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.");
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new FriendlyError(data?.error ?? "El servidor no respondió bien. Probá de nuevo.");
  return data;
}

export function requestLoginMessage(wallet: string): Promise<string> {
  return post<{ message: string }>("/api/auth/nonce", { wallet }).then((r) => r.message);
}

export function verifyLogin(wallet: string, message: string, signature: Uint8Array) {
  return post<{ ok: true; redirect: string; created: boolean }>("/api/auth/verify", {
    wallet,
    message,
    signature: getBase58Decoder().decode(signature),
  });
}
