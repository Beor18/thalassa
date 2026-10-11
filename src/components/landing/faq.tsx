import type { Text } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

// Short answers; the details live in Terms and Privacy. Keep in sync with docs/negocio/landing-copy.md.
const QUESTIONS: { q: Text; a: Text }[] = [
  {
    q: { en: "Does it cost money?", es: "¿Cuesta plata?" },
    a: {
      en: "No, playing is free. Nectar is optional and you buy it with test SOL, which the game sends you every 12 hours (100 Nectar = 0.05 test SOL). None of this is real money.",
      es: "No, jugar es gratis. El néctar es opcional y se compra con SOL de prueba, que el juego te manda cada 12 horas (100 de néctar = 0,05 SOL de prueba). Nada de esto es plata real.",
    },
  },
  {
    q: { en: "Is it pay to win?", es: "¿Se gana pagando?" },
    a: {
      en: "No. Nectar only saves time: it finishes builds sooner and calls the merchant. It can't buy troops, ships, research or points, and it has daily limits.",
      es: "No. El néctar solo ahorra tiempo: termina obras antes y llama al mercader. No compra tropas, barcos, investigación ni puntos, y tiene topes diarios.",
    },
  },
  {
    q: { en: "Do I need a wallet?", es: "¿Necesito una billetera?" },
    a: {
      en: "No. Tapping Play now saves a game key in this browser. If you already have a wallet, you can sign in with it.",
      es: "No. Jugar ahora te guarda una llave de juego en este navegador. Si ya tenés una billetera, podés entrar con ella.",
    },
  },
  {
    q: { en: "What if I clear my browser data?", es: "¿Y si borro los datos del navegador?" },
    a: {
      en: "You lose the key, and your polis with it. To play on more than one device, sign in with your wallet.",
      es: "Perdés la llave y, con ella, tu polis. Para jugar en varios equipos, entrá con tu billetera.",
    },
  },
  {
    q: { en: "Can I play on my phone?", es: "¿Se juega en el celular?" },
    a: {
      en: "Yes, in the browser. You can also install it as an app.",
      es: "Sí, desde el navegador. También la podés instalar como app.",
    },
  },
  {
    q: { en: "Is my polis forever?", es: "¿Mi polis es para siempre?" },
    a: {
      en: "This is a test world. When there's a real-money version, a new world starts, and we'll tell you first.",
      es: "Este es un mundo de prueba. Cuando haya una versión con plata real, arranca un mundo nuevo y te avisamos antes.",
    },
  },
];

/** Plain disclosure list: works without JavaScript and with the keyboard. */
export async function Faq() {
  const { t } = await getI18n();
  return (
    <div className="panel divide-y divide-parchment-3/80 overflow-hidden">
      {QUESTIONS.map(({ q, a }) => (
        <details key={q.en} className="group">
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 px-4 py-2.5 font-display text-[17px] leading-snug font-bold text-ink transition-colors hover:bg-parchment-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
            {t(q)}
            <svg
              viewBox="0 0 16 16"
              aria-hidden
              className="size-4 shrink-0 text-bronze-dark transition-transform duration-200 group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </summary>
          <p className="max-w-prose px-4 pb-4 text-[16px] leading-snug text-ink-soft sm:px-5">{t(a)}</p>
        </details>
      ))}
    </div>
  );
}
