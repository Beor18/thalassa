import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/growth/legal-page";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué guarda Thalassa y qué no: sin mail, sin contraseña, sin seguimiento de terceros.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacidad"
      updated="10 de octubre de 2026"
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
