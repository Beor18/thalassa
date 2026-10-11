# Thalassa · Texto de la portada

Versión 2 · 10 de octubre de 2026. Fórmula: pregunta que engancha, una línea de producto, una acción. Primero la necesidad, después el juego. Los detalles, a demanda (preguntas frecuentes, Términos, Privacidad).

Reglas que este texto cumple: voseo, frases cortas, títulos que afirman, subtítulos de una línea, sin raya larga, sin palabras de cripto en el camino principal, sin nombrar a otros juegos, precios a un toque (en "¿Cuesta plata?"), una sola acción por pantalla.

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
- **Imagen para compartir:** la pintura del puerto (`src/app/opengraph-image.jpg`), 1200 × 630.
- **Datos estructurados:** `VideoGame` (componente `src/components/growth/video-game-json-ld.tsx`).

## 11. Medición en la portada

| Evento | Cuándo | Cómo |
| --- | --- | --- |
| `landing_view` | Al cargar | `<TrackView event="landing_view" withHook />` |
| `play_click` | Toca Jugar ahora (`where`: `hero`, `final` o `wallet_dialog`) | `data-track="play_click"` en el botón |
| `wallet_choose` | Abre Entrar con mi billetera | `data-track="wallet_choose"` en el enlace |
| `polis_view` / `polis_cta_click` | Página pública de una polis | `TrackView` y `data-track` |

Un solo `<TrackClicks />` por página escucha todos los `data-track`.
