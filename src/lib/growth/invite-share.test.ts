import { describe, expect, it } from "vitest";
import { inviteHtml, invitePath, shareLinks } from "./invite-share";

const base = {
  lang: "es" as const,
  description: "Fundá tu polis",
  url: "https://example.com/r/abcd1234?lang=es",
  image: "https://example.com/r/abcd1234/og?lang=es",
  imageAlt: "Invitación",
  target: "/",
  openLabel: "Abrir Thalassa",
};

describe("invite share", () => {
  it("adds the language to the link only when it isn't the default", () => {
    expect(invitePath("abcd1234", "en")).toBe("/r/abcd1234");
    expect(invitePath("abcd1234", "es")).toBe("/r/abcd1234?lang=es");
  });

  it("writes the card tags chats read", () => {
    const html = inviteHtml({ ...base, title: "Pericles te invita a Thalassa" });
    expect(html).toContain('<meta property="og:title" content="Pericles te invita a Thalassa">');
    expect(html).toContain('<meta property="og:image" content="https://example.com/r/abcd1234/og?lang=es">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).toContain('<meta property="og:locale" content="es_AR">');
  });

  it("escapes player names everywhere they go", () => {
    const html = inviteHtml({ ...base, title: `"><script>alert(1)</script> te invita` });
    expect(html).not.toContain("<script>alert(1)");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("puts message and link in the share intents", () => {
    const { whatsapp, x } = shareLinks("Hola 🏛️", "https://example.com/r/abcd1234");
    expect(decodeURIComponent(whatsapp.split("text=")[1])).toBe("Hola 🏛️\n\nhttps://example.com/r/abcd1234");
    const params = new URL(x).searchParams;
    expect(params.get("text")).toBe("Hola 🏛️");
    expect(params.get("url")).toBe("https://example.com/r/abcd1234");
  });
});
