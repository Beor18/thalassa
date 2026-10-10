import type { ReactNode } from "react";

const QUESTIONS: { q: string; a: ReactNode }[] = [
  {
    q: "¿Cuesta plata?",
    a: "No. Jugar no cuesta nada. Hoy todo pasa en la red de prueba de Solana, donde nada vale plata real. El néctar es opcional y se compra con SOL de prueba, que el juego te manda cada 12 horas.",
  },
  {
    q: "¿Qué es la red de prueba?",
    a: "Una versión de Solana para probar. Funciona igual que la de verdad, pero sus monedas no valen nada. Así jugás sin arriesgar un peso.",
  },
  {
    q: "¿Necesito una billetera?",
    a: "No. Jugar ahora te crea una llave de juego en este navegador. Si ya tenés una billetera de Solana, podés entrar con ella.",
  },
  {
    q: "¿Qué pasa si borro los datos del navegador?",
    a: "Perdés la llave y con ella el acceso a tu polis. Si vas a jugar desde varios equipos, entrá con tu propia billetera.",
  },
  {
    q: "¿Se gana pagando?",
    a: "No. El néctar compra tiempo: termina obras y entrenamientos antes y llama al mercader. No compra tropas, barcos, investigación ni puntos. Y tiene topes diarios: nadie gana solo por pagar.",
  },
  {
    q: "¿Se juega en el celular?",
    a: "Sí, desde el navegador. También la podés instalar como app desde el menú del navegador.",
  },
  {
    q: "¿Mi polis pasa a la versión final?",
    a: "No. Cuando haya una versión con plata real, arranca un mundo nuevo y te avisamos antes.",
  },
  {
    q: "¿Quién está detrás?",
    a: "Un jugador de los de antes, desde Argentina. Thalassa es independiente: sin inversores y sin monedas para especular.",
  },
];

/** Plain disclosure list: works without JavaScript and with the keyboard. */
export function Faq() {
  return (
    <div className="panel divide-y divide-parchment-3/80 overflow-hidden">
      {QUESTIONS.map(({ q, a }) => (
        <details key={q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-display text-lg font-bold text-ink transition-colors hover:bg-parchment-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
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
          <p className="max-w-3xl px-4 pb-4 text-[16px] leading-relaxed text-ink-soft sm:px-5">{a}</p>
        </details>
      ))}
    </div>
  );
}
