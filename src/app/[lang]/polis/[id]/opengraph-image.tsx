import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { RESOURCE_LABEL, getPublicCity } from "@/server/growth/public-city";

export const alt = "Una polis de Thalassa en el Egeo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Assets don't depend on the request: read them once per server process.
const assets = (async () => {
  const root = process.cwd();
  const [cinzel, alegreya] = await Promise.all([
    readFile(join(root, "src/server/growth/og-assets/cinzel-700.woff")),
    readFile(join(root, "src/server/growth/og-assets/alegreya-sans-700.woff")),
  ]);
  return { cinzel, alegreya };
})();

/** PNG copy of the building art (the renderer can't draw WebP). See og-assets/NOTES.txt. */
async function buildingArt(type: string) {
  if (!/^[a-z_]+$/.test(type)) return null;
  try {
    const data = await readFile(join(process.cwd(), "src/server/growth/og-assets/buildings", `b-${type}.png`), "base64");
    return `data:image/png;base64,${data}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ cinzel, alegreya }, city] = await Promise.all([assets, getPublicCity(id)]);
  const main = city?.topBuildings[0];
  const art = await buildingArt(main?.type ?? "town_hall");

  return new ImageResponse(
    (
      // Flat sea and one painted building: a photo-like background would weigh 1.5 MB as PNG and
      // messaging apps (WhatsApp first) drop previews that heavy.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Alegreya",
          backgroundColor: "#0b2a4a",
          backgroundImage: "radial-gradient(circle at 78% 58%, #1f6fb2 0%, #134a7c 28%, #0b2a4a 55%, #061a30 100%)",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 10, display: "flex", backgroundColor: "#e3b341" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "56px 64px", width: 760, height: "100%" }}>
          <div style={{ fontFamily: "Cinzel", fontSize: 30, color: "#e3b341", letterSpacing: 8 }}>THALASSA</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 12 }}>
            <div style={{ fontFamily: "Cinzel", fontSize: city && city.name.length > 16 ? 64 : 80, color: "#f7f4ee", lineHeight: 1.05 }}>
              {city?.name ?? "Tu polis en el Egeo"}
            </div>
            <div style={{ fontSize: 34, color: "#e6f3fb" }}>
              {city ? `Polis de ${city.ownerName} en ${city.islandName}, isla de ${RESOURCE_LABEL[city.resource]}` : "Estrategia por navegador"}
            </div>
            {city && (
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <Chip label="Puntos" value={city.score.toLocaleString("es-AR")} />
                <Chip label="Edificios" value={String(city.buildingCount)} />
                {main && <Chip label={main.name} value={`Nivel ${main.level}`} />}
              </div>
            )}
          </div>
          <div style={{ marginTop: 32, fontSize: 28, color: "#e3b341" }}>Fundá la tuya al lado.</div>
        </div>
        {art && (
          // eslint-disable-next-line jsx-a11y/alt-text -- rendered to a PNG by next/og
          <img src={art} width={380} height={380} style={{ position: "absolute", right: 48, bottom: 64 }} />
        )}
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cinzel", data: cinzel, style: "normal", weight: 700 },
        { name: "Alegreya", data: alegreya, style: "normal", weight: 700 },
      ],
    },
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "10px 18px",
        borderRadius: 14,
        background: "rgba(15,58,99,0.85)",
        border: "1px solid rgba(111,179,230,0.35)",
      }}
    >
      <div style={{ fontSize: 18, color: "#6fb3e6", letterSpacing: 2 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: "Cinzel", fontSize: 30, color: "#e6f3fb" }}>{value}</div>
    </div>
  );
}
