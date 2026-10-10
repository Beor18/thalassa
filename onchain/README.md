# Thalassa on-chain

Programa Anchor para comprar **néctar** (la moneda premium del juego; en el programa se llama `ambrosia`) pagando SOL en devnet. El servidor del juego lee la cuenta `Citizen` de cada jugador y acredita en su base la diferencia de `ambrosia_total`.

- **Program ID (devnet):** `6ai9t1gagRGj8gYjGc2PHfQUAeQjzQgssWoAEGa2k1V2`
- **Autoridad / upgrade authority:** `6cAmnqgqsU2VRXt5wRoirb7naLTH26HLEn4iixms8BW8` (`keys/deployer.json`, no se commitea)
- **Precio inicial:** 0,05 SOL (`50_000_000` lamports) por pack de 100 de néctar
- **IDL para la app:** `../src/lib/solana/idl/thalassa.json`

## Deploy actual (devnet, 2026-10-10)

- ProgramData: `EPaiWT5A44R6UrGX6MUoDNfydTfPnfEdve4vp9swfE88` (182.248 bytes, `--max-len` igual al `.so`)
- Deploy: `4sh1ybpP8KGcCkqkETcVaodCCqEnLvFV3V3V2QYTn54gQpnY3nwQ7SSW4AoVb8Khu2yYhvgR1NfpzsviPtagDRzJ`
- Initialize: `4FeZ9VP5xGAvweixrrPi3B16S6kDs36fgyWLBW9C714x7gC8pS8GBRHKEPoDSnQxX7K2LD2HRkrU3NE15o3XnvDt`
- Compra de prueba `buy_ambrosia(1)` desde el deployer: `iV81a8eGFEV4LvezyMfsK4pvJM1quGbfFW1X4YdUX8nPR3dz1xwZVF7k1qCMpuqxC7n5YM5ryvZgosh43bqGmUh` (Citizen `9YU2KchHN2LbXoafH9h1bNqgMkUoVeoK2hFMy4vnUsjA`, 100 néctar)

## PDAs

| Cuenta   | Seeds                          | Dirección (devnet)                              |
|----------|--------------------------------|-------------------------------------------------|
| Config   | `["config"]`                   | `DN2vKLioGdSJYUj87SFNMWAPkK9reuFc6adFrjyzwTLR` |
| Treasury | `["treasury"]`                 | `8jEx15dWxEjZDLy6KDSzqFb4WNTSKUXNRx2zv3yvP9e7` |
| Citizen  | `["citizen", owner_pubkey]`    | una por jugador                                 |

La tesorería es una cuenta del System Program sin datos: solo guarda lamports.

## Instrucciones

| Instrucción | Args | Discriminador |
|---|---|---|
| `initialize` | `price_lamports_per_pack: u64, ambrosia_per_pack: u64` | `[175,175,109,31,13,152,155,237]` |
| `buy_ambrosia` | `packs: u16` (1..=100) | `[86,129,156,216,92,22,140,138]` |
| `withdraw` | `amount: u64` (solo authority) | `[183,18,70,156,148,109,161,34]` |
| `set_price` | `price_lamports_per_pack: u64, ambrosia_per_pack: u64` (solo authority) | `[16,19,182,8,149,83,72,181]` |

Cuentas de `buy_ambrosia`, en orden: `buyer` (signer, mut), `citizen` (mut), `config` (mut), `treasury` (mut), `system_program`.

Evento `AmbrosiaPurchased { buyer, packs, ambrosia, lamports, ambrosia_total }`, discriminador `[214,93,46,33,227,94,193,40]`.

`withdraw` deja la tesorería en 0 o por encima del mínimo de renta (si no, `TreasuryBelowRent`). Si se vacía del todo, la próxima compra la vuelve a crear, siempre que esa compra cubra el mínimo de renta (con 0,05 SOL sobra).

Errores: 6000 `InvalidPackCount`, 6001 `MathOverflow`, 6002 `Unauthorized`, 6003 `InsufficientTreasury`, 6004 `InvalidAmount`, 6005 `InvalidPrice`, 6006 `InvalidAmbrosiaPerPack`, 6007 `TreasuryBelowRent`.

## Layout de cuentas (Borsh, little endian)

Los offsets cuentan desde el inicio de la cuenta; los primeros 8 bytes son el discriminador.

**Citizen** (69 bytes), discriminador `[46,45,63,201,241,115,110,93]`

| Campo | Tipo | Offset | Bytes |
|---|---|---|---|
| owner | Pubkey | 8 | 32 |
| ambrosia_total | u64 | 40 | 8 |
| lamports_spent | u64 | 48 | 8 |
| purchases | u32 | 56 | 4 |
| created_at | i64 (unix s) | 60 | 8 |
| bump | u8 | 68 | 1 |

**Config** (66 bytes), discriminador `[155,12,170,224,30,250,204,130]`

| Campo | Tipo | Offset | Bytes |
|---|---|---|---|
| authority | Pubkey | 8 | 32 |
| price_lamports_per_pack | u64 | 40 | 8 |
| ambrosia_per_pack | u64 | 48 | 8 |
| total_packs_sold | u64 | 56 | 8 |
| bump | u8 | 64 | 1 |
| treasury_bump | u8 | 65 | 1 |

Para leer todos los ciudadanos: `getProgramAccounts` con filtro `memcmp` en offset 0 = discriminador de Citizen (o `dataSize: 69`).

## Build, test, deploy

Requisitos: anchor-cli 0.31.1, solana-cli 2.1 (platform-tools v1.43), Node 20+.

```bash
cd onchain
npm install
anchor build            # genera target/deploy/thalassa.so y target/idl/thalassa.json
anchor test             # levanta solana-test-validator y corre tests/thalassa.ts
```

El `Cargo.lock` está fijado a versiones que compilan con el rustc 1.79 de platform-tools v1.43 (versiones más nuevas piden edition2024). El programa compila con la feature `no-idl` por defecto: no trae las instrucciones de IDL on-chain, así pesa menos y el deploy cuesta menos renta. El IDL viaja como JSON en la app.

Deploy a devnet (el deployer paga y queda como upgrade authority):

```bash
solana rent $(stat -c%s target/deploy/thalassa.so)     # renta necesaria
solana program deploy target/deploy/thalassa.so \
  --program-id target/deploy/thalassa-keypair.json \
  --keypair keys/deployer.json --upgrade-authority keys/deployer.json \
  --max-len $(stat -c%s target/deploy/thalassa.so) -u devnet
npx tsx scripts/initialize.ts     # crea Config (idempotente)
npx tsx scripts/buy.ts 1          # compra de prueba
```

No uses `--use-rpc` contra `api.devnet.solana.com`: manda todas las escrituras juntas y el RPC público corta con 429. Si un deploy se corta, el buffer queda a nombre del deployer: `solana program show --buffers --buffer-authority <deployer> -u devnet` y repetí el deploy con `--buffer <dirección>`; solo escribe lo que falta.

Variables de los scripts: `RPC_URL` (por defecto devnet), `WALLET` (por defecto `keys/deployer.json`), `PRICE_LAMPORTS`, `AMBROSIA_PER_PACK`.

Después de cambiar el programa, copiar el IDL nuevo: `cp target/idl/thalassa.json ../src/lib/solana/idl/thalassa.json`. Si el `.so` crece por encima del `--max-len` usado, hace falta `solana program extend` antes del upgrade.
