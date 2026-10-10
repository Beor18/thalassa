import { describe, expect, it } from "vitest";
import { normalizeReferralCode, referralCode, referralIdRange } from "./referral-code";

const ID = "3f9a1c2e-7b44-4d1a-9c3e-0123456789ab";

describe("referral codes", () => {
  it("is short, lowercase and unambiguous", () => {
    const code = referralCode(ID);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[0-9a-hjkmnp-tv-z]{8}$/);
  });

  it("maps back to a UUID range that contains the player id", () => {
    const range = referralIdRange(referralCode(ID))!;
    expect(range.low <= ID && ID <= range.high).toBe(true);
    expect(range.low.startsWith("3f9a1c2e-7b")).toBe(true);
  });

  it("forgives typos people make reading a code aloud", () => {
    const code = referralCode("00000000-0100-4000-8000-000000000000");
    const typed = code.toUpperCase().replace(/0/g, "O").replace(/1/g, "l");
    expect(normalizeReferralCode(typed)).toBe(code);
  });

  it("rejects junk", () => {
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode("abc")).toBeNull();
    expect(normalizeReferralCode("uuuuuuuu")).toBeNull();
    expect(referralIdRange("../../etc")).toBeNull();
  });
});
