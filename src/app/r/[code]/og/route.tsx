import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { makeI18n, toLocale } from "@/i18n/i18n";
import { OG_SEA, OG_SIZE, buildingArt, ogFonts } from "@/server/growth/og-card";
import { getInviteCard } from "@/server/growth/invite-card";
import { normalizeReferralCode } from "@/server/growth/referral-code";
import { REFERRAL_REWARD } from "@/server/growth/referrals";

/** Preview image of an invite link (/r/<code>/og?lang=es): who invites, their polis and the reward. */
export async function GET(request: NextRequest, { params }: RouteContext<"/r/[code]/og">) {
  const { code: raw } = await params;
  const { t, fmt } = makeI18n(toLocale(request.nextUrl.searchParams.get("lang")));
  const code = normalizeReferralCode(raw);
  const [fonts, card] = await Promise.all([ogFonts(), code ? getInviteCard(code).catch(() => null) : null]);
  const main = card?.city?.topBuildings[0];
  const art = await buildingArt(main?.type ?? "town_hall");
  const name = card?.inviterName ?? "Thalassa";
  const nameSize = name.length <= 12 ? 88 : name.length <= 18 ? 70 : 54;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Alegreya", ...OG_SEA }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 10, display: "flex", backgroundColor: "#e3b341" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "56px 64px", width: 780, height: "100%" }}>
          <div style={{ fontFamily: "Cinzel", fontSize: 30, color: "#e3b341", letterSpacing: 8 }}>THALASSA</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 10 }}>
            <div style={{ fontFamily: "Cinzel", fontSize: nameSize, color: "#f7f4ee", lineHeight: 1.05 }}>{name}</div>
            <div style={{ fontSize: 44, color: "#e6f3fb", lineHeight: 1.1 }}>
              {t({ en: "invites you to the Aegean", es: "te invita al Egeo" })}
            </div>
            <div style={{ fontSize: 30, color: "#b9d9ef", marginTop: 6 }}>
              {card?.city
                ? t({
                    en: `Found your polis next to ${card.city.name}, on ${card.city.islandName}.`,
                    es: `Fundá tu polis al lado de ${card.city.name}, en ${card.city.islandName}.`,
                  })
                : t({ en: "Found your polis and grow it 10 minutes a day.", es: "Fundá tu polis y hacela crecer 10 minutos por día." })}
            </div>
            <div style={{ display: "flex", marginTop: 18 }}>
              <div
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  background: "rgba(106,63,181,0.9)",
                  border: "2px solid #b48cf0",
                  fontSize: 30,
                  color: "#f6efff",
                }}
              >
                {t({ en: `+${fmt(REFERRAL_REWARD)} Nectar for both of you`, es: `+${fmt(REFERRAL_REWARD)} de néctar para los dos` })}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 30, fontSize: 28, color: "#e3b341" }}>
            {t({ en: "Free · No signup · In your browser", es: "Gratis · Sin registro · En el navegador" })}
          </div>
        </div>
        {art && (
          // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element -- rendered to a PNG by next/og
          <img src={art} width={380} height={380} style={{ position: "absolute", right: 48, bottom: 100 }} />
        )}
      </div>
    ),
    {
      ...OG_SIZE,
      fonts,
      // Chats fetch previews again and again; names and cities change slowly. Keep it under ~300 KB
      // (the art at its native 380px): WhatsApp skips heavier preview images.
      headers: { "cache-control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
