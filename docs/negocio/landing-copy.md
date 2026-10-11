# Thalassa · Texto de la portada

Versión 3 · 11 de octubre de 2026. Fórmula: pregunta que engancha, una línea de producto, una acción. Primero la necesidad, después el juego. Los detalles, a demanda (preguntas frecuentes, Términos, Privacidad).

La portada habla inglés (idioma por defecto) y español. Las secciones 1 a 11 son el texto en español; la sección 12 es la versión en inglés, con la misma estructura. El texto vive junto al código (`t({ en, es })`), así que este documento y el código se cambian juntos. El link para compartir la versión en español es `/es` (guarda el idioma y vuelve a la URL limpia).

Reglas que este texto cumple: voseo, frases cortas, títulos que afirman, subtítulos de una línea, sin raya larga, sin palabras de cripto en el camino principal, sin nombrar a otros juegos, precios a un toque (en "¿Cuesta plata?"), una sola acción por pantalla.

Cambios de la versión 3: el sitio público (portada, polis, Términos, Privacidad, metadatos, imágenes para compartir) existe en inglés y en español, con un selector EN · ES arriba a la derecha. El texto en español no cambió; Privacidad suma la cookie `thalassa_lang`.

Cambios contra la versión 1: la portada pasó de tres líneas a dos (el diagnóstico quedó implícito en la línea de producto), se sacaron la etiqueta "Red de prueba" de arriba y la marca chica duplicada, los tres momentos son tarjetas cortas (en el celular se deslizan), "Lo que cuesta" y "Quién lo hace" pasaron a las preguntas y al pie, y las preguntas bajaron de 8 a 6. La página pasó de 5 pantallas a menos de 3 en el celular.

## 1. Estructura

| # | Bloque | Objetivo | Acción |
| --- | --- | --- | --- |
| 1 | Portada (arriba del pliegue) | Gancho y producto | Jugar ahora |
| 2 | De aldea a potencia del Egeo (3 tarjetas) | Mostrar el juego después de la necesidad | ninguna nueva |
| 3 | Preguntas frecuentes + cierre al lado | Sacar miedos y repetir la acción | Jugar ahora |
| 4 | Pie | Quién lo hace y legales | Términos, Privacidad |

En pantallas anchas el cierre queda al lado de las preguntas (y las acompaña al bajar). En el celular va debajo.

## 2. Portada

**Marca:** THALASSA (título grande animado; no hay barra arriba)

### Variante A · Nostalgia (por defecto)

- **Título:** ¿Te acordás de dejar la ciudad construyendo y volver después del colegio?
- **Producto:** Volvió, en el Egeo: diez minutos al día y tu polis sigue creciendo sola.

### Variante B · Tiempo

- **Título:** ¿Tenés diez minutos?
- **Producto:** Alcanzan para fundar tu polis en el Egeo. Después crece sola mientras vivís tu vida.

### Acción

- **Botón:** Jugar ahora
- **Debajo, sin llave guardada:** Gratis. Sin mail ni contraseña.
- **Debajo, con llave guardada:** Seguís con tu polis de este navegador.
- **Enlace secundario:** Entrar con mi billetera
- **Si llegó con invitación:** Te invitó **{nombre}**. Llegá a Intendencia 3 y ganan **50 de néctar** cada uno.
- **Si ya tiene sesión:** botón "Volver a mi polis" y debajo "¿Otra cuenta? Salir".

Mientras el botón trabaja, la línea de abajo se oculta (sin mover nada) para que no cambie de texto debajo del indicador.

### Prueba A/B

- Reparto 50/50 por pestaña: un script en línea tira una moneda antes de pintar, la guarda en la pestaña y muestra solo esa variante, sin parpadeo (`src/components/growth/hook-switch.tsx`). El servidor siempre manda A; quien no tiene JavaScript ve A.
- Se registra `hook: a|b` en `landing_view` y `play_click`.
- Gana la que tenga más `play_click / landing_view` con al menos 300 visitas por variante. Si la diferencia es menor a 3 puntos, queda A.
- Se puede forzar con `?hook=b` en los links de cada publicación para medir por canal.
- La versión 2 cambió las líneas de apoyo, no los títulos: si ya había datos de la versión 1, se comparan aparte.

## 3. De aldea a potencia del Egeo

Tres tarjetas. Cada una arranca su escena animada cuando aparece. En el celular se deslizan de costado (la siguiente se asoma); desde tableta se ven las tres juntas.

| | Título | Texto |
| --- | --- | --- |
| I | Fundá tu polis | Ordenás la obra y te vas. Se levanta sin vos. |
| II | Comerciá entre islas | La tuya da vino y la de al lado, mármol. Tus barcos llevan lo que falta. |
| III | Conquistá el mar | Primero los bárbaros de tu isla. Después, quien se anime. |

## 4. Preguntas frecuentes

**¿Cuesta plata?**
No, jugar es gratis. El néctar es opcional y se compra con SOL de prueba, que el juego te manda cada 12 horas (100 de néctar = 0,05 SOL de prueba). Nada de esto es plata real.

**¿Se gana pagando?**
No. El néctar solo ahorra tiempo: termina obras antes y llama al mercader. No compra tropas, barcos, investigación ni puntos, y tiene topes diarios.

**¿Necesito una billetera?**
No. Jugar ahora te guarda una llave de juego en este navegador. Si ya tenés una billetera, podés entrar con ella.

**¿Y si borro los datos del navegador?**
Perdés la llave y, con ella, tu polis. Para jugar en varios equipos, entrá con tu billetera.

**¿Se juega en el celular?**
Sí, desde el navegador. También la podés instalar como app.

**¿Mi polis es para siempre?**
Este es un mundo de prueba. Cuando haya una versión con plata real, arranca un mundo nuevo y te avisamos antes.

Cuando exista la versión con plata real, "¿Cuesta plata?" muestra la escalera en dólares de `modelo-de-negocio.md` y el tope mensual.

## 5. Cierre

- **Título:** Tu isla ya tiene lugar.
- **Botón:** Jugar ahora

## 6. Pie

Hecho en Argentina por un jugador de los de antes. · Términos · Privacidad

(El mismo pie va en las páginas públicas de cada polis y en las legales.)

## 7. Prueba social sin inventar

Hoy no hay jugadores para citar, así que no los inventamos.

- **Ahora:** el pie dice quién lo hace. El arte del juego es la prueba de oficio.
- **Contador:** "Ya hay {n} polis en el Egeo" aparece recién con 100 o más. Antes, no se muestra.
- **Galería:** con 12 o más polis públicas, mostrar 6 reales con enlace a su página.
- **Testimonios:** solo reales, con permiso y con el nombre que la persona elija.
- **Nunca:** números inventados, "miles de jugadores", logos de medios que no escribieron.

## 8. Textos del flujo de juego

| Estado | Texto |
| --- | --- |
| Botón en reposo | Jugar ahora |
| Creando la llave | Preparando tu llave… |
| Cuenta nueva | Fundando tu polis… |
| Cuenta existente | Volviendo a tu polis… |
| Navegando | Zarpando… |
| Sin conexión | No pudimos conectar. Revisá tu conexión y probá de nuevo. |
| Error del servidor | No pudimos abrir tu polis. Probá de nuevo en un momento. |
| Código vencido | El código para entrar venció. Probá de nuevo. |
| Diálogo de billetera, título | Entrar con tu billetera |
| Diálogo, explicación (si hay billeteras) | Firmás un mensaje que prueba que la cuenta es tuya. No cuesta nada ni mueve fondos. |
| Fila de billetera | Elegir → Conectando… → Firmá en tu billetera… → Entrando… |
| Canceló en la billetera | Cancelaste en la billetera. Podés intentar de nuevo cuando quieras. |
| Sin billeteras instaladas | No encontramos una billetera en este navegador. No hace falta: podés jugar sin ella. Botón: **Jugar sin billetera** (cierra el diálogo y hace lo mismo que Jugar ahora). Enlace: Instalar Phantom. |
| Volver con sesión | Volver a mi polis · ¿Otra cuenta? Salir |
| Invitación | Te invitó {nombre}. Llegá a Intendencia 3 y ganan 50 de néctar cada uno. |

## 9. Página pública de cada polis (`/polis/{id}`)

- **Arriba:** CAPITAL (o COLONIA) DEL EGEO · nombre de la polis · "Polis de {arconte} en {isla}, isla de {recurso}." · Puntos, Edificios, Fundada (mes y año).
- **Lo que ya levantó:** hasta 4 edificios en una fila, con su nivel en una medalla.
- **Cierre:** "Hay lugar en la isla de al lado." · "Gratis, en el navegador. Sin mail ni contraseña." · botón **Fundá tu polis** (pasa por el link de invitación del dueño).
- Todo entra en una pantalla de celular.

## 10. Metadatos para buscadores y redes

- **Título:** Thalassa · Tu polis en el Egeo
- **Descripción:** Estrategia por navegador como la de antes. Fundá tu polis en el Egeo, comerciá entre islas y conquistá el archipiélago. Sin instalar nada y sin plata real.
- **Imagen para compartir:** la pintura del puerto con THALASSA, "Tu polis en el Egeo" y "Diez minutos al día. Crece sola mientras vivís tu vida.", 1200 × 630, una por idioma (`src/app/[lang]/opengraph-image.tsx` sirve `src/app/[lang]/_og/home-{en,es}.jpg`). Son JPEG de unos 160 KB porque la pintura en PNG pesa más de 2 MB y WhatsApp descarta vistas previas tan pesadas. Si cambia el texto o el arte: `node "src/app/[lang]/_og/render.mjs"`.
- **Imagen de cada polis:** se dibuja al vuelo en el idioma de la página (`src/app/[lang]/polis/[id]/opengraph-image.tsx`).
- **Datos estructurados:** `VideoGame` (componente `src/components/growth/video-game-json-ld.tsx`).

## 11. Medición en la portada

| Evento | Cuándo | Cómo |
| --- | --- | --- |
| `landing_view` | Al cargar | `<TrackView event="landing_view" withHook />` |
| `play_click` | Toca Jugar ahora (`where`: `hero`, `final` o `wallet_dialog`) | `data-track="play_click"` en el botón |
| `wallet_choose` | Abre Entrar con mi billetera | `data-track="wallet_choose"` en el enlace |
| `polis_view` / `polis_cta_click` | Página pública de una polis | `TrackView` y `data-track` |

Un solo `<TrackClicks />` por página escucha todos los `data-track`.

## 12. English version

Same structure and rules, in English: need first (building an empire in the Aegean, ten minutes a day), product after, one action. Native and short, no crypto words on the main path (the sign-in dialog can name wallet apps), no em dash. "Néctar" is **Nectar**, "SOL de prueba" is **test SOL**.

### Metadata

- **Title:** Thalassa · Your polis in the Aegean
- **Description:** Build an empire in the Aegean, ten minutes a day. Old-school browser strategy: found your polis, trade and conquer. Nothing to install, no real money.
- **Share image:** THALASSA · Your polis in the Aegean · Ten minutes a day. It grows while you're away.
- **Open Graph locale:** `en_US` (Spanish: `es_AR`), each pointing to the other.
- **Install name (manifest, English only):** Thalassa · Your polis in the Aegean

### Hero

**Hook A · Memory (default)**
- **Headline:** Remember leaving your city building and rushing back after school?
- **Product:** It's back, in the Aegean: ten minutes a day and your polis keeps growing while you're away.

**Hook B · Time**
- **Headline:** Got ten minutes?
- **Product:** Enough to found your polis in the Aegean. Then it grows on its own while you live your life.

The A/B test runs the same way in both languages (the variant is per tab, not per language). Compare the variants within each language.

### Action

- **Button:** Play now
- **Below, no saved key:** Free. No email, no password.
- **Below, saved key:** Your polis in this browser is waiting.
- **Secondary link:** Sign in with my wallet
- **Signed in:** Back to my polis · Different account? Log out
- **Scroll cue:** How it plays

### From village to Aegean power

| | Title | Text |
| --- | --- | --- |
| I | Found your polis | Order the build and walk away. It rises without you. |
| II | Trade between islands | Yours grows wine, the next one marble. Your ships carry what's missing. |
| III | Rule the sea | First the barbarians on your island. Then anyone who dares. |

### Common questions

**Does it cost money?**
No, playing is free. Nectar is optional and you buy it with test SOL, which the game sends you every 12 hours (100 Nectar = 0.05 test SOL). None of this is real money.

**Is it pay to win?**
No. Nectar only saves time: it finishes builds sooner and calls the merchant. It can't buy troops, ships, research or points, and it has daily limits.

**Do I need a wallet?**
No. Tapping Play now saves a game key in this browser. If you already have a wallet, you can sign in with it.

**What if I clear my browser data?**
You lose the key, and your polis with it. To play on more than one device, sign in with your wallet.

**Can I play on my phone?**
Yes, in the browser. You can also install it as an app.

**Is my polis forever?**
This is a test world. When there's a real-money version, a new world starts, and we'll tell you first.

### Closing and footer

- **Closing:** Your island is waiting. · Play now
- **Footer:** Made in Argentina by an old-school player. · Terms · Privacy

### Play flow

| State | Text |
| --- | --- |
| Idle | Play now |
| Creating the key | Preparing your key… |
| New account | Founding your polis… |
| Existing account | Returning to your polis… |
| Navigating | Setting sail… |
| Generic error | We couldn't open your polis. Try again. |
| Wallet dialog, title | Sign in with your wallet |
| Dialog, explanation (wallets found) | You sign a message that proves the account is yours. It's free and moves no funds. |
| Wallet row | Choose → Connecting… → Approve in your wallet… → Signing in… |
| Canceled in the wallet | You canceled in your wallet. Try again whenever you like. |
| Wallet sign-in failed | We couldn't sign in with {wallet}. Try again. |
| No wallets installed | We didn't find a wallet in this browser. You don't need one: you can play without it. Button: **Play without a wallet**. Link: Install Phantom. |

Network and server errors come from `friendlySolanaText` and the login helpers, already in both languages.

### Public polis page

- **Top:** AEGEAN CAPITAL (or AEGEAN COLONY) · polis name · "{archon}'s polis on {island}, a {resource} island." · Points, Buildings, Founded (month and year).
- **Already built:** up to 4 buildings with their level.
- **Closing:** "There's room on the next island." · "Free, in your browser. No email, no password." · button **Found your polis**.
- **Share card:** "{archon}'s polis on {island}, a {resource} island" · Points · Buildings · {building} Level {n} · "Found yours next door."

### Legal pages

Full English versions of Terms and Privacy, same content as the Spanish ones (`src/app/[lang]/terminos/page.tsx` and `src/app/[lang]/privacidad/page.tsx`). The URLs stay `/terminos` and `/privacidad` in both languages.
