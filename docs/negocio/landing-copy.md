# Thalassa · Texto de la portada

Versión 1 · 10 de octubre de 2026. Fórmula: pregunta que engancha, diagnóstico con empatía, una línea de producto, una acción. Primero la necesidad, después el juego.

Reglas que este texto cumple: voseo, frases cortas, títulos que afirman, subtítulos de una línea, sin raya larga, sin palabras de cripto, sin nombrar a otros juegos, precios a la vista, una sola acción por pantalla.

## 1. Estructura

| # | Bloque | Objetivo | Acción |
| --- | --- | --- | --- |
| 1 | Portada (arriba del pliegue) | Gancho, diagnóstico, producto | Jugar ahora |
| 2 | Así se juega (3 momentos) | Mostrar el juego después de la necesidad | ninguna nueva |
| 3 | Lo que cuesta | Honestidad sobre plata y red de prueba | ninguna nueva |
| 4 | Quién lo hace | Prueba social honesta | ninguna nueva |
| 5 | Preguntas frecuentes | Sacar miedos | ninguna nueva |
| 6 | Cierre | Repetir la misma acción | Jugar ahora |
| 7 | Pie | Legales | Términos, Privacidad |

## 2. Portada

**Marca:** THALASSA
**Etiqueta:** Red de prueba · sin plata real

### Variante A · Nostalgia (por defecto)

- **Título:** ¿Te acordás de dejar la ciudad construyendo y volver después del colegio?
- **Diagnóstico:** Después llegaron el trabajo, los horarios y los juegos que piden la noche entera.
- **Producto:** Thalassa es tu polis en el Egeo. La ordenás en diez minutos y sigue creciendo sola.

### Variante B · Tiempo

- **Título:** ¿Tenés diez minutos?
- **Diagnóstico:** La estrategia de ahora te pide horas. La de antes te esperaba.
- **Producto:** Thalassa es estrategia por navegador en el Egeo. Tu polis avanza mientras vivís tu vida.

### Acción

- **Botón:** Jugar ahora
- **Debajo, sin llave guardada:** Sin mail, sin contraseña y sin plata real. Tu llave de juego queda en este navegador.
- **Debajo, con llave guardada:** Seguís con la llave de juego guardada en este navegador.
- **Enlace secundario:** Entrar con mi billetera
- **Si llegó con invitación:** Te invitó **{nombre}**. Cuando llegues a Intendencia 3, suman 50 de néctar cada uno.
- **Si ya tiene sesión:** botón "Volver a mi polis" y debajo "Entraste como {ABCD…WXYZ}. Salir".

### Prueba A/B

- Reparto 50/50 por pestaña: un script en línea tira una moneda antes de pintar, la guarda en la pestaña y muestra solo esa variante, sin parpadeo (`src/components/growth/hook-switch.tsx`). El servidor siempre manda A; quien no tiene JavaScript ve A.
- Se registra `hook: a|b` en `landing_view` y `play_click`.
- Gana la que tenga más `play_click / landing_view` con al menos 300 visitas por variante. Si la diferencia es menor a 3 puntos, queda A.
- Se puede forzar con `?hook=b` en los links de cada publicación para medir por canal.

## 3. Así se juega

**Título de la sección (queda el de la versión animada):** De aldea a potencia del Egeo

| | Título | Texto |
| --- | --- | --- |
| I | Tu polis arranca con cuarenta ciudadanos. | Los mandás al aserradero, levantás una Academia y te vas. La obra sigue sin vos. |
| II | Las islas se necesitan. | La tuya da vino y la de al lado, mármol. Tus barcos llevan lo que falta. |
| III | El mar no es de nadie. | Hoplitas, arqueros y catapultas. Primero los bárbaros de tu isla, después quien se anime. |

## 4. Lo que cuesta

- **Título (publicado):** Jugar no cuesta nada.
- **Texto:** El néctar es opcional: termina obras antes y llama al mercader. Hoy se compra con SOL de prueba (100 de néctar = 0,05 SOL de prueba) y el juego te manda SOL de prueba cada 12 horas. Nada de esto es plata real.

Cuando exista la versión con plata real, este bloque muestra la escalera en dólares de `modelo-de-negocio.md` y el tope mensual.

## 5. Quién lo hace (prueba social sin inventar)

Hoy no hay jugadores para citar, así que no los inventamos.

- **Ahora (publicado):** título "Hecho por un jugador de los de antes." y texto "Desde Argentina, como proyecto independiente. Sin inversores y sin monedas para especular." Se puede sumar foto o firma del fundador si quiere.
- **El arte habla:** las pinturas del juego son la prueba de oficio. Mostrar una polis real crecida.
- **Contador:** "Ya hay {n} polis en el Egeo" aparece recién con 100 o más. Antes, no se muestra.
- **Galería:** con 12 o más polis públicas, mostrar 6 reales con enlace a su página.
- **Testimonios:** solo reales, con permiso y con el nombre que la persona elija.
- **Nunca:** números inventados, "miles de jugadores", logos de medios que no escribieron.

## 6. Preguntas frecuentes

**¿Cuesta plata?**
No. Jugar no cuesta nada. Hoy todo pasa en la red de prueba de Solana, donde nada vale plata real. El néctar es opcional y se compra con SOL de prueba, que el juego te manda cada 12 horas.

**¿Qué es la red de prueba?**
Una versión de Solana para probar. Funciona igual que la de verdad, pero sus monedas no valen nada. Así jugás sin arriesgar un peso.

**¿Necesito una billetera?**
No. Jugar ahora te crea una llave de juego en este navegador. Si ya tenés una billetera de Solana, podés entrar con ella.

**¿Qué pasa si borro los datos del navegador?**
Perdés la llave y con ella el acceso a tu polis. Si vas a jugar desde varios equipos, entrá con tu propia billetera.

**¿Se gana pagando?**
No. El néctar compra tiempo: termina obras y entrenamientos antes y llama al mercader. No compra tropas, barcos, investigación ni puntos. Y tiene topes diarios: nadie gana solo por pagar.

**¿Se juega en el celular?**
Sí, desde el navegador. También la podés instalar como app desde el menú del navegador.

**¿Mi polis pasa a la versión final?**
No. Cuando haya una versión con plata real, arranca un mundo nuevo y te avisamos antes.

**¿Quién está detrás?**
Un jugador de los de antes, desde Argentina. Thalassa es independiente: sin inversores y sin monedas para especular.

## 7. Cierre

- **Título:** Tu isla ya tiene lugar.
- **Botón:** Jugar ahora

## 8. Pie

Thalassa · estrategia clásica por navegador · Términos · Privacidad

## 9. Textos del flujo de juego

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
| Diálogo, explicación | Vas a firmar un mensaje para confirmar que la cuenta es tuya. No cuesta nada ni mueve fondos. |
| Fila de billetera | Elegir → Conectando… → Firmá en tu billetera… → Entrando… |
| Canceló en la billetera | Cancelaste en la billetera. Podés intentar de nuevo cuando quieras. |
| Sin billeteras instaladas | No encontramos billeteras de Solana en este navegador. Instalá una, recargá esta página y elegila acá. O cerrá esto y tocá Jugar ahora: no hace falta billetera. |
| Enlace de instalación | Instalar Phantom (el nombre acá es necesario para que la persona sepa qué instalar) |
| Volver con sesión | Volver a mi polis · Entraste como {ABCD…WXYZ}. Salir |
| Invitación | Te invitó {nombre}. Cuando llegues a Intendencia 3, suman 50 de néctar cada uno. |

## 10. Metadatos para buscadores y redes

- **Título:** Thalassa · Tu polis en el Egeo
- **Descripción:** Estrategia por navegador como la de antes. Fundá tu polis en el Egeo, comerciá entre islas y conquistá el archipiélago. Sin instalar nada y sin plata real.
- **Imagen para compartir:** la pintura del puerto (`src/app/opengraph-image.jpg`), 1200 × 630.
- **Datos estructurados:** `VideoGame` (componente `src/components/growth/video-game-json-ld.tsx`).

## 11. Medición en la portada

| Evento | Cuándo | Cómo |
| --- | --- | --- |
| `landing_view` | Al cargar | `<TrackView event="landing_view" props={{ hook }} />` |
| `play_click` | Toca Jugar ahora | `data-track="play_click"` en el botón |
| `wallet_choose` | Abre Entrar con mi billetera | `data-track="wallet_choose"` en el enlace |

Un solo `<TrackClicks />` por página escucha todos los `data-track`.
