import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/growth/legal-page";

export const metadata: Metadata = {
  title: "Términos",
  description: "Las reglas de Thalassa, en simple: red de prueba, sin plata real, tu llave es tuya.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos"
      updated="10 de octubre de 2026"
      intro="Thalassa es un juego de estrategia por navegador que está en desarrollo. Hoy corre en la red de prueba de Solana: nada de lo que pasa adentro cuesta ni vale plata real."
    >
      <h2>La red de prueba</h2>
      <ul>
        <li>El SOL de la red de prueba no tiene valor. No se compra con plata y no se puede cambiar por plata.</li>
        <li>
          La ambrosía se compra con SOL de prueba y solo sirve adentro del juego. No se transfiere, no se vende y no se cambia
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
        <li>Cuando la cuenta invitada llega a Intendencia 3, las dos suman 50 de ambrosía. Una sola vez por invitado.</li>
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
