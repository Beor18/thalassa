import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/growth/legal-page";
import { getI18n } from "@/i18n/server";

const UPDATED = new Date("2026-10-10");

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t({ en: "Terms", es: "Términos" }),
    description: t({
      en: "Thalassa's rules in plain words: test network, no real money, your key is yours.",
      es: "Las reglas de Thalassa, en simple: red de prueba, sin plata real, tu llave es tuya.",
    }),
    alternates: { canonical: "/terminos" },
  };
}

export default async function TermsPage() {
  const { lang } = await getI18n();
  return lang === "en" ? <TermsEn /> : <TermsEs />;
}

function TermsEn() {
  return (
    <LegalPage
      title="Terms"
      updated={UPDATED}
      intro="Thalassa is a browser strategy game in development. Today it runs on Solana's test network: nothing in it costs real money or is worth any."
    >
      <h2>The test network</h2>
      <ul>
        <li>SOL on the test network has no value. It can&apos;t be bought with money or exchanged for money.</li>
        <li>
          Nectar is bought with test SOL and only works inside the game. It can&apos;t be transferred, sold or exchanged for
          money or SOL.
        </li>
        <li>Purchases are recorded on the test network. A purchase can&apos;t be undone.</li>
      </ul>

      <h2>Your account is your key</h2>
      <ul>
        <li>You sign in by signing a message with a wallet. Signing is free and moves no funds.</li>
        <li>
          If you tap Play now, the key is saved in this browser. If you clear your browser data or switch devices, you lose
          access to your polis. We don&apos;t keep a copy of your key and can&apos;t recover it.
        </li>
        <li>If you use your own wallet, look after it like you would any other.</li>
      </ul>

      <h2>A game in the making</h2>
      <ul>
        <li>We may change the balance, add or remove features, and reset the world. When we can, we&apos;ll tell you first.</li>
        <li>We may delete accounts that go unused for a long time.</li>
        <li>The game is provided as is, with no guarantee that it will always work or be free of bugs.</li>
      </ul>

      <h2>Fair play</h2>
      <ul>
        <li>No offensive names, no cheating, no programs that play for you and no exploiting bugs on purpose.</li>
        <li>If someone does, we may rename them, take away rewards or suspend the account.</li>
      </ul>

      <h2>Invites</h2>
      <ul>
        <li>Every player has an invite link. It counts for new accounts that sign up through that link within the next 30 days.</li>
        <li>When the invited account reaches Town Hall 3, both accounts get 50 Nectar. Once per invited player.</li>
        <li>Whoever invites can earn up to 5 rewards a day. Any extra ones are credited later.</li>
        <li>Inviting yourself or making accounts to collect rewards doesn&apos;t count. If it happens, we take the rewards away.</li>
      </ul>

      <h2>If there&apos;s ever real money</h2>
      <p>
        If Thalassa moves to Solana&apos;s main network, where purchases are paid with real money, we&apos;ll publish new terms
        and tell you first. Nothing you have on the test network moves to the main network on its own.
      </p>

      <h2>Your data</h2>
      <p>
        What we store and what we don&apos;t is in <Link href="/privacidad">Privacy</Link>.
      </p>
      <ContactLine>Questions? Write to us at</ContactLine>
    </LegalPage>
  );
}

function TermsEs() {
  return (
    <LegalPage
      title="Términos"
      updated={UPDATED}
      intro="Thalassa es un juego de estrategia por navegador que está en desarrollo. Hoy corre en la red de prueba de Solana: nada de lo que pasa adentro cuesta ni vale plata real."
    >
      <h2>La red de prueba</h2>
      <ul>
        <li>El SOL de la red de prueba no tiene valor. No se compra con plata y no se puede cambiar por plata.</li>
        <li>
          El néctar se compra con SOL de prueba y solo sirve adentro del juego. No se transfiere, no se vende y no se cambia
          por plata ni por SOL.
        </li>
        <li>Las compras quedan registradas en la red de prueba. Una compra hecha no se puede deshacer.</li>
      </ul>

      <h2>Tu cuenta es tu llave</h2>
      <ul>
        <li>Entrás firmando un mensaje con una billetera. Firmar no cuesta nada ni mueve fondos.</li>
        <li>
          Si tocás Jugar ahora, la llave se guarda en este navegador. Si borrás los datos del navegador o cambiás de equipo,
          perdés el acceso a tu polis. Nosotros no tenemos copia de tu llave y no la podemos recuperar.
        </li>
        <li>Si usás tu propia billetera, cuidala como cuidarías cualquier otra.</li>
      </ul>

      <h2>Un juego en construcción</h2>
      <ul>
        <li>Podemos cambiar el balance, agregar o sacar funciones, y reiniciar el mundo. Si podemos, avisamos antes.</li>
        <li>Podemos borrar cuentas que no se usen por mucho tiempo.</li>
        <li>El juego se ofrece tal como está, sin garantías de que funcione siempre ni sin errores.</li>
      </ul>

      <h2>Juego limpio</h2>
      <ul>
        <li>Nada de nombres ofensivos, trampas, programas que jueguen por vos ni aprovechar errores a propósito.</li>
        <li>Si alguien lo hace, podemos cambiarle el nombre, quitarle premios o suspender la cuenta.</li>
      </ul>

      <h2>Invitaciones</h2>
      <ul>
        <li>Cada jugador tiene un link para invitar. Vale para cuentas nuevas que entran con ese link en los 30 días siguientes.</li>
        <li>Cuando la cuenta invitada llega a Intendencia 3, las dos suman 50 de néctar. Una sola vez por invitado.</li>
        <li>Hay un máximo de 5 premios por día para quien invita. Los que se pasan se acreditan después.</li>
        <li>No vale invitarse a uno mismo ni crear cuentas para cobrar premios. Si pasa, los quitamos.</li>
      </ul>

      <h2>Si algún día hay plata real</h2>
      <p>
        Si Thalassa pasa a la red principal de Solana, donde las compras se pagan con plata real, vamos a publicar términos
        nuevos y avisarte antes. Nada de lo que tengas en la red de prueba pasa solo a la red principal.
      </p>

      <h2>Tus datos</h2>
      <p>
        Qué guardamos y qué no está en <Link href="/privacidad">Privacidad</Link>.
      </p>
      <ContactLine>¿Dudas? Escribinos a</ContactLine>
    </LegalPage>
  );
}
