import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";

/**
 * Data Access Layer entry point: the verified player id for this request.
 * Redirects to the landing page when there is no valid session.
 */
export const requirePlayerId = cache(async (): Promise<string> => {
  const session = await readSession();
  if (!session) redirect("/");
  return session.playerId;
});

export const optionalSession = cache(readSession);
