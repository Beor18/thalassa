# Thalassa

[![CI](https://github.com/Beor18/thalassa/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Beor18/thalassa/actions/workflows/ci.yml)

Estrategia por navegador en el Egeo, inspirada en los clásicos tipo Ikariam. Fundás una polis en una isla, ponés a tu gente a talar y a trabajar la mina, investigás, armás una flota, comerciás entre islas, saqueás bárbaros y vecinos y fundás colonias. La ambrosía (la moneda premium) se compra on-chain con SOL de **Solana devnet**.

- **Next.js 16.4** (App Router, Cache Components, Server Actions, `proxy.ts`), React 19.3, Tailwind 4.
- **PostgreSQL 17** local en Docker con **Drizzle ORM** (compatible con Supabase: cambiás `DATABASE_URL` y listo).
- **Solana devnet**: login firmando un mensaje (Sign in with Solana), programa Anchor `thalassa` para comprar ambrosía, `@solana/kit` + Wallet Standard en el cliente.
- Arte: 43 assets generados con **ChatGPT (modo Work)**, convertidos a WebP (`scripts/import-art.mjs`).

## Arrancar

```bash
pnpm install
pnpm db:up          # Postgres 17 en Docker, puerto 5434 (docker-compose.yml también incluido)
cp .env.example .env.local   # completá SESSION_SECRET (openssl rand -base64 48)
pnpm db:migrate
pnpm dev            # http://localhost:3000
```

Tocá **Jugar ahora**: el juego crea una llave de prueba en tu navegador (sin instalar nada), firma el ingreso y funda tu polis. También podés entrar con Phantom, Solflare o Backpack en devnet.

## Cómo está armado

| Capa | Dónde | Qué hace |
| --- | --- | --- |
| Datos del juego | `src/game/data.ts` | Edificios, unidades, investigaciones, balance. |
| Motor | `src/game/engine.ts` | Simulación determinística y pura: producción, población, obras, entrenamiento, combate, botín. |
| Persistencia | `src/db/schema.ts` | Jugadores, islas, ciudades (estado de ciudad en JSONB), misiones, informes, nonces, ledger de ambrosía. |
| Servidor | `src/server/*` | `withPlayer` bloquea la fila del jugador, avanza el tiempo hasta "ahora", aplica el comando y guarda. Las misiones se resuelven en orden temporal con un advisory lock. |
| Acciones | `src/server/actions.ts` | Server Actions validadas con zod que devuelven `ActionResult` y refrescan la vista. |
| Lectura | `src/server/queries.ts` | Snapshots sin efectos secundarios (avanzan en memoria, no escriben). |
| UI | `src/app/(game)/*`, `src/components/*` | Ciudad, isla, mundo, investigación, flota y tropas, informes, ranking, ambrosía. |
| On-chain | `onchain/` | Programa Anchor (devnet) y su IDL en `src/lib/solana/idl/thalassa.json`. |

No hay ticks ni cron: cada request avanza la cuenta desde `last_tick` hasta ahora (evaluación perezosa), así el juego corre igual con un jugador o con mil. `GAME_SPEED` (por defecto ×10) acelera todo para probar.

### Ambrosía on-chain

1. El jugador llama `buy_ambrosia(packs)` del programa `thalassa`: paga `packs × precio` en SOL de devnet a la tesorería (PDA `["treasury"]`) y su cuenta `Citizen` (PDA `["citizen", wallet]`) suma `ambrosia_total`.
2. El servidor lee esa cuenta (`src/server/solana.ts`) y acredita solo la diferencia con lo ya sincronizado. Es idempotente: no hay que confiar en el cliente ni parsear transacciones.

| | Devnet |
| --- | --- |
| Programa | [`6ai9t1gagRGj8gYjGc2PHfQUAeQjzQgssWoAEGa2k1V2`](https://explorer.solana.com/address/6ai9t1gagRGj8gYjGc2PHfQUAeQjzQgssWoAEGa2k1V2?cluster=devnet) |
| Config (precio: 0,05 SOL = 100 ambrosía) | `DN2vKLioGdSJYUj87SFNMWAPkK9reuFc6adFrjyzwTLR` |
| Tesorería | `8jEx15dWxEjZDLy6KDSzqFb4WNTSKUXNRx2zv3yvP9e7` |
| Autoridad / deployer | `6cAmnqgqsU2VRXt5wRoirb7naLTH26HLEn4iixms8BW8` (`onchain/keys/deployer.json`, no se commitea) |

Detalles del programa, tests y deploy en [`onchain/README.md`](onchain/README.md).

### SOL de prueba

El airdrop público de devnet suele estar limitado. Por eso el juego tiene su propia canilla (`src/server/faucet.ts`): manda 0,06 SOL (alcanza para un pack) a la billetera del jugador, una vez cada 12 h. La llave está en `keys/faucet.json` (no se commitea); para recargarla: `solana transfer $(solana address -k keys/faucet.json) 0.5 -u devnet`.

## Scripts

| Comando | Para qué |
| --- | --- |
| `pnpm test` | Tests del motor (vitest). |
| `pnpm smoke` | Prueba de punta a punta contra Postgres: transporte, saqueo, bárbaros, informes, colonia. Limpia lo que crea. |
| `pnpm dev:session [wallet]` | Crea un jugador y te imprime una cookie de sesión para probar con `curl`. |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` | Drizzle. |
| `node scripts/import-art.mjs <carpeta>` | Convierte PNG del pack de arte a WebP en `public/assets`. |

## Supabase

El esquema es Postgres estándar. Para usar Supabase: creá el proyecto, copiá la connection string (modo session, puerto 5432) en `DATABASE_URL` y corré `pnpm db:migrate`.
