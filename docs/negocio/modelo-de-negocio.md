# Thalassa · Modelo de negocio

Versión 1 · 10 de octubre de 2026. Producto independiente que se paga solo. Sin token, sin especulación, sin rondas.

## Decisiones en una mirada

| Tema | Decisión |
| --- | --- |
| Qué vendemos | Tiempo y estilo. Nunca poder directo. |
| Moneda | Una sola moneda premium, la que hoy se llama ambrosía. No se transfiere, no se vende, no se cambia por plata. |
| Precio base | 100 de ambrosía = US$ 0,99. Escalera de 4 packs con bonus moderado, más un pack de bienvenida. |
| Tope de gasto | US$ 50 por cuenta por mes. Sin packs de más de US$ 19,99. |
| Otros ingresos | Pase de temporada (US$ 4,99) y cosméticos (escudos, estandartes, velas, estilos de polis). |
| Cobro | En la red principal, en dólares digitales (USDC) para que el precio no se mueva. SOL como alternativa, con el precio en dólares a la vista. |
| Meta para vivir de esto | ~7.000 jugadores por mes (~2.000 por día), 2 % pagando US$ 8 por mes: ~US$ 1.100 brutos, ~US$ 1.000 netos de servidores. |
| Cuándo red principal | Cuando la red de prueba muestre D7 ≥ 10 % sobre 200 cuentas y el 5 % de los activos a 7 días compre ambrosía de prueba. |

**Decisión pendiente del fundador:** renombrar la ambrosía. Ikariam llama "Ambrosia" a su moneda premium; quien lo jugó va a leer Thalassa como copia y hay riesgo de marca. Propuesta: **néctar** (mismo universo, nombre propio). Alternativas: laureles, óbolos. También conviene verificar que "Thalassa" no choque con otro juego registrado antes de invertir en marca.

## 1. Para quién

**Jugador principal: el arconte nostálgico.** 28 a 42 años, habla español (Argentina, México, Chile, Colombia, España). Jugó Ikariam, Travian, OGame o Grepolis entre 2006 y 2014, en el colegio, la facultad o la oficina. Hoy tiene trabajo, quizás hijos, y ratos de 10 minutos. Extraña la estrategia lenta, la isla compartida y el informe de batalla a la mañana. No quiere instalar nada ni competir contra billeteras gordas. La mayoría no tiene cripto.

**Secundario: el jugador de Solana sin ganas de especular.** Ya tiene billetera, está cansado de juegos que eran una excusa para un token y quiere algo que se juegue. Es el primero en comprar, prueba los pagos y trae a su comunidad.

**Señales de mercado** (fuentes en `growth.md`):

- Los clásicos siguen vivos y facturan: InnoGames superó los 2.000 millones de euros acumulados; Grepolis tiene más de 75.000 jugadores diarios y el 30 % juega hace más de 10 años. Ikariam sigue abierto con servidores en español hasta 2028.
- El navegador todavía convoca: OpenFront.io, estrategia en el navegador y de código abierto, pasó el millón de jugadores mensuales.
- Lo que murió fue el modelo token: más del 90 % de los juegos cripto cerraron. En Solana hay intentos tipo Travian y OGame con moneda o token propio; ninguno se sostiene con moneda premium sin especulación. Ese lugar está libre.

## 2. Propuesta de valor

> Tu polis en el Egeo, que crece mientras hacés otra cosa. Diez minutos para ordenarla y volvés cuando quieras.

- **Para el jugador:** la estrategia por navegador de antes, en español, sin instalar nada, sin mail ni contraseña. La plata compra tiempo y estilo, con topes; nunca ejércitos.
- **Para el que paga:** precios en dólares a la vista, packs chicos, sin cajas sorpresa, compra verificable en la red.
- **Por qué Solana, del lado del negocio:** cobrar en todo el mundo sin tarjeta y sin tiendas que se quedan con el 30 %; costo por cobro de centavos; la cuenta es una llave del jugador, no una contraseña que hay que custodiar; cada compra se puede verificar. El jugador no ve nada de esto: toca Jugar ahora y juega.

## 3. Fuentes de ingreso

### 3.1 Moneda premium (núcleo, ~75 % del ingreso esperado)

Hoy la ambrosía termina obras y entrenamientos al instante (1 por minuto que falta) y llama al mercader (20 por 1.000 de un recurso). Referencia de valor: una obra de mitad de partida tarda ~1,5 h a velocidad normal, terminarla cuesta ~90, o sea US$ 0,90.

**Escalera de precios para la red principal** (SOL calculado a US$ 150 como referencia; se recalcula al momento de cobrar):

| Pack | Ambrosía | Bonus | Precio | En SOL (ref.) | US$ por 100 |
| --- | --- | --- | --- | --- | --- |
| Bienvenida (una vez por cuenta) | 300 | +200 % | US$ 0,99 | 0,0066 | 0,33 |
| Puñado | 100 | 0 % | US$ 0,99 | 0,0066 | 0,99 |
| Ánfora | 550 | +10 % | US$ 4,99 | 0,0333 | 0,91 |
| Cofre | 1.200 | +20 % | US$ 9,99 | 0,0666 | 0,83 |
| Tesoro | 2.600 | +30 % | US$ 19,99 | 0,1333 | 0,77 |

Por qué así: el bonus máximo es +30 % (los clásicos llegan a 2,6 veces más por dólar en el pack grande) para no empujar a comprar más de lo que se necesita; los montos calzan con lo que se gasta (un pack chico alcanza para una obra larga); el de bienvenida baja la barrera del primer pago, que es la conversión más difícil.

**Red de prueba hoy:** 0,05 SOL de prueba = 100. Se queda así: sirve para probar el flujo, no el precio. Para medir disposición a pagar, la tienda de prueba puede mostrar al lado "en la versión final: US$ 0,99" y registrar qué pack eligen.

### 3.2 Pase de temporada (~20 %)

- Temporadas de 8 semanas con mundo nuevo opcional y ranking semanal.
- **Camino gratis** para todos: ambrosía chica, escudo de temporada, título.
- **Camino de pago, US$ 4,99** (o 500 de ambrosía): estandarte y estilo de polis exclusivos, velas de barco, marco en el informe de batalla, 300 de ambrosía repartida en la temporada.
- Nada del pase da recursos, tropas, investigación ni puntos.

### 3.3 Cosméticos (~5 % al principio, crece con la base)

Se compran con la moneda premium, así hay una sola moneda y un solo precio para entender.

| Cosmético | Precio |
| --- | --- |
| Estandarte o escudo de la polis | 150 a 300 |
| Estilo de polis (espartano, corintio, cretense) | 400 a 600 |
| Velas de la flota | 200 |
| Título junto al nombre en el ranking | 100 |
| Cambio de nombre del arconte (después del primero gratis) | 50 |

### 3.4 Extras en la red, sin especulación (opcional, fase 2)

- **Trofeo de temporada** no transferible: registro en la red de que terminaste top 100 o fundaste en la temporada 1. Gratis para el jugador, lo paga el juego. Es orgullo y prueba social, no un activo.
- **Acta de fundación** de la polis registrada en la red: gratis, opcional.
- Ninguno se puede vender ni transferir. No hay mercado secundario.

### 3.5 Lo que no hacemos

Token del juego, cajas sorpresa pagas, publicidad, venta de datos, mercado entre jugadores con plata real, ventajas por tener más SOL.

## 4. Barreras contra el pagar para ganar

Reglas de diseño. Hay que implementarlas en el motor y la tienda antes de cobrar plata real.

**Lo que la moneda nunca compra:** tropas, barcos, investigación, puntos de ranking, protección contra ataques, bonificaciones de ataque o defensa, lugares para colonias, ni recursos por encima de la capacidad del depósito.

**Topes:**

| Regla | Valor | Estado |
| --- | --- | --- |
| Terminar al instante, por día y por cuenta | 300 de ambrosía (5 h) | A implementar |
| Terminar entrenamiento de tropas al instante | Solo si falta ≤ 60 min, y nunca con un ataque propio en viaje | A implementar |
| Mercader | 3 veces por día por ciudad | A implementar (hoy no tiene tope) |
| Gasto con plata real | US$ 50 por mes por cuenta | A implementar en red principal |
| Pack más grande | US$ 19,99 | Decidido |

**Camino gratis a lo mismo:** invitar (50 por invitado que llega a Intendencia 3, ya funciona), camino gratis del pase, encargos diarios chicos. Quien no paga accede a la misma comodidad, más lento.

**Transparencia:** precio en dólares al lado de cada cantidad; en el informe de batalla se ve si alguno de los dos usó ambrosía para entrenar las tropas de ese combate.

## 5. Números por jugador

### Costo de infraestructura

Cada página del juego hace ~8 consultas a Postgres y no hay procesos de fondo (la simulación avanza al leer). La red se consulta solo al sincronizar compras y en la canilla.

| Etapa | Jugadores por día | Armado | Costo por mes | Por jugador diario por mes |
| --- | --- | --- | --- | --- |
| 0. Red de prueba | < 200 | VPS chico (2 vCPU, 4 GB) con Postgres en Docker, nodo público de prueba | US$ 5 a 9 | ~US$ 0,03 |
| 1. Red principal | ~500 | VPS 4 GB + copias de seguridad + dominio + nodo gratuito (1M créditos) | ~US$ 15 | ~US$ 0,03 |
| 1b. Misma etapa, todo administrado | ~500 | Hosting Pro (US$ 20) + Postgres administrado (~US$ 19) | ~US$ 40 | ~US$ 0,08 |
| 2. Crecimiento | ~2.000 | VPS más grande + Postgres administrado + nodo pago (US$ 49) | ~US$ 100 | ~US$ 0,05 |

Notas: el plan gratuito del hosting más usado para Next.js es solo para uso no comercial; con cobros reales hay que pasar a Pro o a VPS. Recomendación: VPS desde el día uno, es lo más barato y no cambia con la escala chica.

### Ingreso por jugador (supuestos de planificación, no promesas)

| Supuesto | Valor | Base |
| --- | --- | --- |
| Pagan en un mes | 2 % de los activos del mes | Estrategia en navegador y celular: 1 a 3 %; los mejores casos, 6 % |
| Gasto por pagador por mes (ARPPU) | US$ 8 | Con tope de US$ 50 y packs chicos |
| Ingreso por activo mensual | US$ 0,16 | 2 % × 8 |
| Jugadores diarios sobre mensuales | 28 % | Típico del género |
| Ingreso por jugador diario por mes | ~US$ 0,57 | 0,16 / 0,28 |

Margen: cada jugador diario deja ~US$ 0,57 por mes y cuesta US$ 0,03 a 0,08. Cobrar en la red cuesta centavos, contra 30 % en tiendas de apps y ~6 % con tarjeta en la región.

### Puntos de equilibrio

| Meta | Pagadores (a US$ 8) | Activos por mes (2 %) | Activos por día |
| --- | --- | --- | --- |
| Cubrir servidores (US$ 15) | 2 | ~100 | ~30 |
| Cubrir servidores y herramientas (US$ 100) | 13 | ~650 | ~180 |
| US$ 1.000 netos por mes para el fundador | ~140 | ~7.000 | ~2.000 |

## 6. Indicadores

| Indicador | Meta red de prueba | Meta red principal | Cómo se mide |
| --- | --- | --- | --- |
| Portada → Jugar ahora | 35 % | 35 % | `landing_view` → `play_click` |
| Clic → cuenta creada | 85 % | 85 % | `play_click` → `login_success` nuevo |
| Cuenta → primera obra | 80 % | 80 % | `first_build_started` |
| D1 | 30 % | 30 % | `active_day` al día 1 |
| D7 | 10 % | 12 % | `active_day` al día 7 |
| D30 | 4 % | 5 % | `active_day` al día 30 |
| Pagan en el mes | 5 % de activos a 7 días (con SOL de prueba) | 2 % de activos del mes | libro de ambrosía |
| ARPPU | n/a | US$ 8 | libro de ambrosía |
| Invitados por cuenta nueva | 0,2 | 0,3 | `referral_linked` / cuentas nuevas |

Referencias: en celular, el D1 del mejor cuarto ronda 27 %, el D7 mediano 3,4 a 3,9 % y el del mejor cuarto 7 a 8 %; los mejores juegos de estrategia llegan a D1 42 %, D7 17 % y D30 8 %. Pedimos más que la mediana porque el jugador nostálgico vuelve por hábito, y menos que los líderes porque no pagamos publicidad.

Todo sale de `pnpm metrics [días]`.

## 7. Camino a la red principal

1. **Beta abierta en la red de prueba** (ahora): validar D1 y D7 sobre 200 cuentas reales, probar el flujo de compra con SOL de prueba, implementar los topes de la sección 4.
2. **Preparación** (cuando se cumplen las metas): cobro en USDC con precio fijo; revisión externa del programa (la tesorería pasa a una billetera multifirma); topes de gasto en el servidor; política de devoluciones; términos nuevos; precio en dólares visible en toda la tienda; verificación de edad básica.
3. **Temporada 1 en la red principal**: mundo nuevo. Lo de la red de prueba no pasa automáticamente (ya lo dicen los términos). Los jugadores de la beta reciben un trofeo de fundador no transferible.
4. **Puente para quien no tiene cripto**: evaluar antes de lanzar una forma de pagar con tarjeta o medios locales que acredite lo mismo. Sin eso, el 2 % de pagadores es optimista para un público que en su mayoría no tiene billetera.

## 8. Legal y ética (no es asesoramiento legal)

- **Moneda cerrada:** no transferible, no canjeable por plata ni SOL, sin mercado secundario. Así queda fuera de las reglas de activos virtuales (excepción de red limitada en la UE; en Argentina, vender un bien propio del juego por cripto en principio no es una actividad de proveedor de activos virtuales, pero conviene confirmarlo con un abogado antes de cobrar).
- **Sin azar pago:** nada de cajas sorpresa. Brasil las prohíbe para menores desde 2026 y en Europa están bajo la lupa.
- **Pautas europeas para monedas de juego (2025):** precio en plata real al lado de la moneda, no forzar packs más grandes que lo necesario, derecho de arrepentimiento hasta que se usa la moneda, cuidado especial con menores. Las cumplimos por diseño.
- **Defensa del consumidor (Argentina, Ley 24.240):** precios finales visibles, botón de arrepentimiento para compras no usadas, canal de contacto.
- **Privacidad:** sin mail, sin IP guardada, sin seguimiento de terceros. Ya publicado en `/privacidad`.
- **Menores:** en la red principal, aviso de edad y tope de gasto más bajo si declara menos de 18.

## 9. Riesgos y qué hacemos

| Riesgo | Mitigación |
| --- | --- |
| Se lee como copia de Ikariam | Renombrar la moneda, identidad visual propia (ya pintada), mecánicas propias (vecinos, temporadas cortas). |
| El público nostálgico no tiene cripto | Jugar no lo necesita. Para pagar: puente con tarjeta antes de la red principal. |
| Pocos jugadores en la isla = mundo vacío | Temporadas con mundos chicos; propuesta: que el invitado funde en la isla de quien lo invitó si hay lugar. |
| Abuso de invitaciones con cuentas falsas | Premio recién en Intendencia 3, tope diario de 5, sin autoinvitación (ya implementado). |
| Precio de SOL volátil | Cobro en USDC; si se cobra en SOL, cotización al momento y precio en dólares a la vista. |
