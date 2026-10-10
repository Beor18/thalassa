import "server-only";
import { cookies } from "next/headers";
import { track } from "./analytics";
import { REFERRAL_COOKIE } from "./referral-code";
import { linkReferral } from "./referrals";

/**
 * After a successful Sign in with Solana: records the funnel step and, for brand-new accounts,
 * links whoever invited them (thalassa_ref cookie set by /r/<code>). Never throws.
 */
export async function onLogin(player: { id: string; wallet: string; created: boolean }) {
  try {
    const jar = await cookies();
    const code = jar.get(REFERRAL_COOKIE)?.value;
    const referrer = player.created ? await linkReferral(player, code) : null;
    await track("login_success", { new: player.created, invited: referrer != null }, player.id);
    // The invite did its job (or the account already existed): stop showing "Te invitó...".
    if (code) jar.delete(REFERRAL_COOKIE);
  } catch (err) {
    console.error("[thalassa] onLogin failed", err);
  }
}
