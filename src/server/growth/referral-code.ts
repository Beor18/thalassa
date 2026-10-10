/**
 * Invite codes derived from the player id: the first 40 bits of the UUID in Crockford base32.
 * Eight lowercase characters, no i, l, o or u, so they survive being read aloud or typed from a photo.
 * Pure module (no server-only) so it can be unit tested and used anywhere.
 */

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const CODE_LENGTH = 8;
const PREFIX_HEX = 10; // 40 bits

export const REFERRAL_COOKIE = "thalassa_ref";
export const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 3600;

export function referralCode(playerId: string): string {
  const hex = playerId.replace(/-/g, "").slice(0, PREFIX_HEX);
  if (!/^[0-9a-f]{10}$/i.test(hex)) throw new Error("Invalid player id");
  let n = BigInt(`0x${hex}`);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out = ALPHABET[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out;
}

/** Normalizes what people type (O for 0, I or L for 1, any case). Returns null when it can't be a code. */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/o/g, "0").replace(/[il]/g, "1");
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!ALPHABET.includes(ch)) return null;
  return s;
}

/** The UUID range whose ids start with the code's 40 bits: [low, high] for an indexed BETWEEN. */
export function referralIdRange(code: string): { low: string; high: string } | null {
  const clean = normalizeReferralCode(code);
  if (!clean) return null;
  let n = 0n;
  for (const ch of clean) n = (n << 5n) | BigInt(ALPHABET.indexOf(ch));
  const hex = n.toString(16).padStart(PREFIX_HEX, "0");
  const head = `${hex.slice(0, 8)}-${hex.slice(8, 10)}`;
  return { low: `${head}00-0000-0000-000000000000`, high: `${head}ff-ffff-ffff-ffffffffffff` };
}
