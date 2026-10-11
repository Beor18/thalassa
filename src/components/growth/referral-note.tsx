import { cookies } from "next/headers";
import { cacheLife } from "next/cache";
import clsx from "clsx";
import { REFERRAL_COOKIE, normalizeReferralCode } from "@/server/growth/referral-code";
import { REFERRAL_REWARD, REFERRAL_TOWN_HALL, findReferrer } from "@/server/growth/referrals";

async function referrerName(code: string) {
  "use cache";
  cacheLife("minutes");
  return (await findReferrer(code))?.name ?? null;
}

/**
 * "Te invitó X" for visitors who arrived through an invite link (thalassa_ref cookie).
 * Reads cookies: render it inside a <Suspense> boundary. Renders nothing for everyone else.
 */
export async function ReferralNote({ className }: { className?: string }) {
  const code = normalizeReferralCode((await cookies()).get(REFERRAL_COOKIE)?.value);
  if (!code) return null;
  const name = await referrerName(code);
  if (!name) return null;
  return (
    <p
      className={clsx(
        "max-w-md rounded-xl bg-sea-950/75 px-3 py-2 text-[15px] text-foam ring-1 ring-gold/40 backdrop-blur",
        className,
      )}
    >
      Te invitó <b className="text-gold">{name}</b>. Llegá a Intendencia {REFERRAL_TOWN_HALL} y ganan{" "}
      <b className="text-ambrosia-soft">{REFERRAL_REWARD} de néctar</b> cada uno.
    </p>
  );
}
