import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/growth/legal-page";
import { getI18n } from "@/i18n/server";

const UPDATED = new Date("2026-10-11");

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t({ en: "Privacy", es: "Privacidad" }),
    description: t({
      en: "What Thalassa stores and what it doesn't: no email, no password, no third-party tracking.",
      es: "Qué guarda Thalassa y qué no: sin mail, sin contraseña, sin seguimiento de terceros.",
    }),
    alternates: { canonical: "/privacidad" },
  };
}

export default async function PrivacyPage() {
  const { lang } = await getI18n();
  return lang === "en" ? <PrivacyEn /> : <PrivacyEs />;
}

function PrivacyEn() {
  return (
    <LegalPage
      title="Privacy"
      updated={UPDATED}
      intro="To play, we don't ask for your email, a password or your real name. We keep just enough for your polis to be there when you come back."
    >
      <h2>What we store</h2>
      <ul>
        <li>Your wallet&apos;s public address. It&apos;s your account.</li>
        <li>The state of your game: cities, resources, troops, reports and the name you choose.</li>
        <li>If you came in through an invite link, who invited you.</li>
        <li>
          Our own usage events, like &quot;opened the home page&quot; or &quot;started their first build&quot;. They show us
          where people get stuck. They carry a random number that lasts as long as the tab stays open, and nothing else.
        </li>
      </ul>

      <h2>What we don&apos;t store</h2>
      <ul>
        <li>No email, no password, no real name, no phone number.</li>
        <li>Your IP address. We look at it for an instant, in memory, to stop abuse, and it isn&apos;t written down anywhere.</li>
        <li>We don&apos;t use tracking cookies or advertising or analytics scripts from other companies.</li>
      </ul>

      <h2>Cookies and data in your browser</h2>
      <ul>
        <li>
          <b>thalassa_session</b>: keeps you signed in for up to 7 days.
        </li>
        <li>
          <b>thalassa_city</b>: remembers which city you were looking at.
        </li>
        <li>
          <b>thalassa_ref</b>: remembers who invited you, for up to 30 days. It&apos;s deleted when you sign in.
        </li>
        <li>
          <b>thalassa_lang</b>: remembers your language (English or Spanish), for up to a year.
        </li>
        <li>If you tap Play now, your game key is saved in this browser. It never leaves your device.</li>
      </ul>
      <p>If your browser asks not to be tracked (Global Privacy Control or Do Not Track), we don&apos;t record events from it.</p>

      <h2>What&apos;s public</h2>
      <ul>
        <li>
          Every polis has a public page with its name, your archon name, the island, its main buildings and its points. If
          you don&apos;t want to be recognized, pick a name that isn&apos;t yours.
        </li>
        <li>
          Nectar purchases are transactions on Solana&apos;s test network, which is public: anyone can see them with an
          explorer. We can&apos;t delete that.
        </li>
      </ul>

      <h2>Where it all lives</h2>
      <p>
        On the servers that run the game and in its database. We don&apos;t sell or share your data with anyone for
        advertising.
      </p>
      <ContactLine>If you want us to delete your account, write to us at</ContactLine>
    </LegalPage>
  );
}

function PrivacyEs() {
  return (
    <LegalPage
      title="Privacidad"
      updated={UPDATED}
      intro="Para jugar no te pedimos mail, contraseña ni tu nombre real. Guardamos lo justo para que tu polis siga ahí cuando vuelvas."
    >
      <h2>Qué guardamos</h2>
      <ul>
        <li>La dirección pública de tu billetera. Es tu cuenta.</li>
        <li>El estado de tu partida: ciudades, recursos, tropas, informes y el nombre que elijas.</li>
        <li>Si entraste con un link de invitación, quién te invitó.</li>
        <li>
          Eventos de uso propios, como &quot;abrió la portada&quot; o &quot;empezó su primera obra&quot;. Sirven para saber
          dónde se traba la gente. Llevan un número al azar que dura lo que dura la pestaña abierta, y nada más.
        </li>
      </ul>

      <h2>Qué no guardamos</h2>
      <ul>
        <li>Ni mail, ni contraseña, ni nombre real, ni teléfono.</li>
        <li>
          Tu dirección IP. La miramos un instante, en memoria, para frenar abusos, y no queda escrita en ningún lado.
        </li>
        <li>No usamos cookies de seguimiento ni scripts de publicidad o analítica de otras empresas.</li>
      </ul>

      <h2>Cookies y datos en tu navegador</h2>
      <ul>
        <li>
          <b>thalassa_session</b>: mantiene tu sesión abierta hasta 7 días.
        </li>
        <li>
          <b>thalassa_city</b>: recuerda qué ciudad estabas mirando.
        </li>
        <li>
          <b>thalassa_ref</b>: recuerda quién te invitó, hasta 30 días. Se borra cuando entrás.
        </li>
        <li>
          <b>thalassa_lang</b>: recuerda tu idioma (inglés o español), hasta un año.
        </li>
        <li>Si tocás Jugar ahora, tu llave de juego queda guardada en este navegador. No sale de tu equipo.</li>
      </ul>
      <p>Si tu navegador pide no ser rastreado (Global Privacy Control o Do Not Track), no registramos eventos desde ahí.</p>

      <h2>Lo que es público</h2>
      <ul>
        <li>
          Cada polis tiene una página pública con su nombre, tu nombre de arconte, la isla, sus edificios principales y sus
          puntos. Si no querés que te reconozcan, elegí un nombre que no sea el tuyo.
        </li>
        <li>
          Las compras de néctar son transacciones en la red de prueba de Solana, que es pública: cualquiera puede verlas con
          un explorador. Eso no lo podemos borrar.
        </li>
      </ul>

      <h2>Dónde vive todo</h2>
      <p>
        En los servidores donde corre el juego y en su base de datos. No vendemos ni compartimos tus datos con nadie para
        publicidad.
      </p>
      <ContactLine>Si querés que borremos tu cuenta, escribinos a</ContactLine>
    </LegalPage>
  );
}
