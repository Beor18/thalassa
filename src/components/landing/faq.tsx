import type { ReactNode } from "react";

// Short answers; the details live in Términos and Privacidad. Keep in sync with docs/negocio/landing-copy.md.
const QUESTIONS: { q: string; a: ReactNode }[] = [
  {
    q: "¿Cuesta plata?",
    a: "No, jugar es gratis. El néctar es opcional y se compra con SOL de prueba, que el juego te manda cada 12 horas (100 de néctar = 0,05 SOL de prueba). Nada de esto es plata real.",
  },
  {
    q: "¿Se gana pagando?",
    a: "No. El néctar solo ahorra tiempo: termina obras antes y llama al mercader. No compra tropas, barcos, investigación ni puntos, y tiene topes diarios.",
  },
  {
    q: "¿Necesito una billetera?",
    a: "No. Jugar ahora te guarda una llave de juego en este navegador. Si ya tenés una billetera de Solana, podés entrar con ella.",
  },
  {
    q: "¿Y si borro los datos del navegador?",
    a: "Perdés la llave y, con ella, tu polis. Para jugar en varios equipos, entrá con tu billetera.",
  },
  {
    q: "¿Se juega en el celular?",
    a: "Sí, desde el navegador. También la podés instalar como app.",
  },
  {
    q: "¿Mi polis es para siempre?",
    a: "Este es un mundo de prueba. Cuando haya una versión con plata real, arranca un mundo nuevo y te avisamos antes.",
  },
];

/** Plain disclosure list: works without JavaScript and with the keyboard. */
export function Faq() {
  return (
    <div className="panel divide-y divide-parchment-3/80 overflow-hidden">
      {QUESTIONS.map(({ q, a }) => (
        <details key={q} className="group">
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 px-4 py-2.5 font-display text-[17px] leading-snug font-bold text-ink transition-colors hover:bg-parchment-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
            {q}
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
          <p className="max-w-prose px-4 pb-4 text-[16px] leading-snug text-ink-soft sm:px-5">{a}</p>
        </details>
      ))}
    </div>
  );
}
