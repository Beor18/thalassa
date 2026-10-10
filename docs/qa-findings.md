# QA findings (browser pass, 2026-10-10)

Tester: QA agent (Chrome, desktop 1280x800 and mobile 375x812). Format:
`- [severity] [route] what happens · how to reproduce · expected · (excerpt)`

## Test data changes

- Chrome player `GvXDVvPke5c7ph5v2jZLCrmhtT4rNtHHWaSFbWU1KaHc` (created through "Jugar ahora", city `1b717eb0-3e08-4852-8d90-8096f772b0f1` on Syros, island 14): `players.research = 500, gold = 50000`; `cities.wood=2900, marble=2500, wine=2000, crystal=2000, sulfur=2500`.
- Headless audits used extra throwaway players created with `pnpm dev:session` (no data changes).

## Environment notes

- Chrome `resize_window` had no effect (window stays 1850x1030, probably maximized by the WM), and `X-Frame-Options: DENY` blocks an iframe harness. So interactive play-through ran in Chrome at 1850x1030, and the exact 1280x800 / 375x812 checks (screenshots, h-scroll, broken images, overflow, small touch targets, console, failed requests) ran in headless Chromium (Playwright) with a session cookie.

## Screenshots

All under `/tmp/claude-1000/-home-fernando/914efdee-da71-45d1-9112-1e3db862a4b3/scratchpad/shots/` (not in the repo, the QA brief only allows writing this file):

- Chrome 1850x1030, real play-through: `chrome/screenshot-1791665897162-0.jpg` (city with Academia, Depósito, Cuartel, Taberna, Puerto, ship), `chrome/screenshot-1791665897163-1.jpg` (informes with battle report), `chrome/screenshot-1791665897164-2.jpg` (mundo).
- Desktop 1280x800 (headless): `d__.png` (landing), `d1__ciudad.png`, `d1__isla_14.png`, `d1__mundo.png`, `d1__investigacion.png`, `d1__tesoro.png`, `d1__ranking.png`, `d1__militar.png`, `h__ciudad_1b717eb0_3e08_4852_8d90_8096f772b0f1.png` (built-up city), `h__ciudad_…_slot_3.png` (Cuartel panel).
- Mobile 375x812 (headless): `m__.png` (landing), `m1__ciudad.png`, `m1__isla_14.png`, `m1__mundo.png`, `m1__tesoro.png`, `m2__ciudad_…_slot_0.png|_slot_1.png|_slot_3.png|_slot_12.png` (bottom sheets), `m2__isla_14_panel_sawmill.png|_camp.png|_plot_2.png`, `m2__militar.png`, `m2__informes.png`, `m2__ranking.png`, `m2__investigacion.png`, `m3_sheet_open.png`, `m3_island_viewport.png`, `m4_after_jugar.png`.

## / (landing)

- Passed: renders at 1280 and 375 with no h-scroll, no broken images, no em dash, voseo copy. "Entrar con mi billetera" opens a `<dialog>` chooser (Phantom, MetaMask) that closes with the X, with Escape and with a backdrop click. "Jugar ahora" calls `/api/auth/nonce` + `/api/auth/verify` (200) and lands in `/ciudad/<id>` logged in; session cookie is httpOnly.
- [minor] [/] Mobile 375: the small "THALASSA" logo in the top bar sits on the busiest part of the hero painting and has low contrast · open / at 375x812 · add a scrim or text shadow behind the top bar.
- [minor] [/] While the page was being edited the hero painting was missing on first paint in Chrome (only the sea tile showed) and appeared later; check that the hero image is preloaded/`priority` so the first screen is never the plain sea.

## Cross-cutting

- [blocker, transient] [all game routes] For ~1 min every game page rendered the error boundary "Se cortó el viento" because the code selected `players.faucet_claimed_at` before the migration had been applied (`PostgresError: column "faucet_claimed_at" does not exist` in `loadPlayer`, src/server/state.ts:23). Resolved once the column was added. Make sure the migration ships together with the schema change (and that `pnpm db:migrate` is part of setup docs), otherwise every existing install breaks on update.
- [info] [all game routes] Chrome's network panel lists some RSC fetches as 503 (`/ciudad?_rsc=…`, `/ciudad/<id>?_rsc=…`) and headless shows aborted prefetches (`/mundo?_rsc=… ERR_ABORTED`) right after login/navigation, while the dev log records 200 and pages render fine. Most likely prefetch cancellation / extension reporting; see the /tesoro note.
- [minor] [header, mobile] "Salir" link is a 28x20 px touch target at 375 px (and THALASSA logo 28 px tall). Expected >= 44x44 (or at least 32) hit area.
- [minor] [header] Warehouse capacity per resource ("940 / 2.500") only exists in a `title` tooltip, so on touch devices there is no way to see how full the depot is. Consider a thin fill bar or showing the cap on tap.
- [minor] [header] "devnet ×10" badge and advisor copy "Se compra con SOL de devnet" use English/crypto jargon ("devnet"). Copy rule asks for no English leftovers; "red de prueba" is already used on the landing.
- [info] [all game routes] With cacheComponents, previously visited pages stay mounted hidden (`display:none` Activity), so the DOM holds two headers/navs/toasters (a stale one with old numbers). Not visible, but `find`/a11y tools see duplicate nav and live regions; verify nothing in the hidden copy keeps ticking timers or fires toasts.

## /ciudad/[id]

- Passed: 14 plots render (12 stone plots + 2 docks); markers and sprites sit on the painted stone plots and docks at 1280, 1850 and 375. `?slot=N` opens the panel; X, Escape and backdrop close it (URL drops `?slot`). Build (Academia, Depósito, Cuartel, Taberna, Puerto), upgrade (Intendencia 1 to 2), cancel (refund + toast "Obra cancelada. Te devolvimos los materiales."), countdown on the plot and in "Obras", building appears automatically when the timer ends, Academia scientists slider + "Máx", Cuartel training (10 lanceros), Taberna wine level, Puerto: buy ship (price rises 400, 460), transport form with labelled inputs, ship sprite appears in the water. Every action shows a toast and the header numbers change at once. Values match after reload. Foreign or unknown city ids redirect to your own city; `?slot=99` is ignored.
- [minor] [/ciudad] Layout shift: opening a long panel adds the page scrollbar, the scene shrinks ~15 px and every plot moves sideways (I mis-clicked a dock because of it) · open `?slot=3` (Lugar libre, long list) then `?slot=12` · plots stay put · add `scrollbar-gutter: stable` on html or keep panel height inside the viewport.
- [minor] [/ciudad] Desktop panels taller than the viewport scroll inside their own scrollbar while the page also scrolls (two nested scrollbars, e.g. Puerto and Lugar libre panels at 1850x1030).
- [minor] [/ciudad] The selected plot label ("Lugar libre" on slot 2) and the countdown pill ("Nv1 · 1 min 10 s") on slots 1 to 3 overlap the Intendencia roof · build on slot 2 · labels should not cover neighbouring sprites (offset or z-order under sprites).
- [minor] [/ciudad] While the Intendencia is upgrading the building sprite is replaced by bare scaffolding, so the town hall looks demolished. Consider building + scaffold overlay for upgrades (keep plain scaffold for new builds).
- [minor] [/ciudad?slot=4 Taberna] With wine level 0 already selected, the disabled main button reads "Dejar de servir vino" · open a new Taberna · expected a neutral disabled label ("Elegí cuánto vino servir") until a different level is picked.
- [minor] [/ciudad?slot=4 Taberna] Hovering the selected level chip ("1") turns its label invisible (light hover background with the light selected text color).
- [minor] [/ciudad?slot=3 Cuartel] Training shows unit upkeep ("Sueldo 10/h") but not the effect on net gold. After training 10 lanceros with 8 scientists the city went from +330/h to −40/h without warning. The sawmill panel already shows "Impuestos que dejás de cobrar"; do the same here ("Tu oro por hora pasa a −40/h").
- [minor] [/ciudad?slot=3 Cuartel] While the troops are away attacking, "Tropas en la ciudad" says "Todavía no hay tropas. Entrená unas pocas…" · send all lanceros to the camp, open the Cuartel · expected "10 lanceros fuera, vuelven en …".
- [minor] [/ciudad?slot=12 Puerto] Toast after sending 1 ship: "Los barcos zarparon." (plural for 1 ship).
- [minor] [/ciudad "La ciudad hoy"] Satisfacción uses a faint text smiley "☺" while every other stat has a painted icon.
- [minor] [/ciudad, mobile] Bottom sheet is a fixed `<section>` without `role="dialog"`/`aria-modal`, focus stays on `<body>` when it opens, and the page behind keeps scrolling under it (wheel/touch scrolled the page 365 px). Escape and the 44x44 "Cerrar panel" work. Also the city name badge covers the top-left plot's "+" at 375.
- [minor] [/ciudad, mobile] In headless Chromium at DPR 2 the body font shows uneven letter spacing ("pro tege", "co ntento", "po blación" in `m3_sheet_open.png`); not visible at DPR 1. Worth checking on a real phone.
- [info] [/ciudad] Advisor hint jumps to "Probá la ambrosía" every time any obra is running, even when there is a cheaper next step (e.g. "Sentá científicos" is only shown after). Its "Ir" link label is vague; "buttons say what they do" suggests "Ir al aserradero", "Construir Academia", etc.

## /isla/[id]

- Passed: sawmill panel (assign 20 workers, toast "Trabajadores asignados.", header wood rate +200), donation (100 wood, progress 100 de 350), quarry panel locked behind Riqueza with a link to Investigación, camp panel (defenders, loot, "Elegir todas", attack, toast "La flota de guerra zarpó."), free plot panel on another island with a full requirements checklist and travel time. Coastal plot markers sit on the 8 coastal spots of the painted island; the player's polis sits on its coastal plot. Escape and X close the panel. Unknown island ids show "Esa isla no existe" with links back.
- [minor] [/isla/14?panel=camp] After launching the attack the camp panel only says "No hay soldados en casa… Ir al Cuartel"; nothing shows the attack on its way (countdown) and no ship appears on the island map. Expected "Tus tropas llegan en 52 s" like /militar.
- [minor] [/isla/14?panel=camp] The panel shows "Fuerza de ataque 40" vs "Defensa enemiga 263" but lets a new player send everything without any warning; 9 of 10 lanceros died. A one-line "Con esta fuerza vas a perder" would avoid a feel-bad first battle. (Also: the starting camp on Syros is already level 4 with 32 lanceros + 16 honderos, while the welcome report invites new players to attack it.)
- [minor] [/isla/*?panel=sawmill|mine] Donation input placeholder is "500" even when only 250 or 350 are missing.
- [minor] [/isla, mobile] On 375 the island scene is a horizontal scroller that starts at the left edge; resource labels on the right ("Cantera") are off-screen at first. Fine with the "Deslizá" hint, but consider starting centered on the player's polis like the city does.
- [info] [/isla/999, /isla/abc] Render the friendly "Esa isla no existe" page with HTTP 200 instead of 404.

## /mundo

- Passed: 36 islands, current island highlighted, hovering/selecting an island updates the top card with travel time ("Viaje desde Polis GvXD 8 min 57 s", "Ver Kea"), "Más cerca de …" list with times, clicking an island opens it, legend. No h-scroll at 375.
- [minor] [/mundo] Islands at the edges of the map viewport are cut (Delos, Ios at the top, Tinos/Sikinos at the sides) on first view at 1280 and 1850; the map box scrolls both ways with its own scrollbars. Consider padding the world so edge islands are fully visible.
- [minor] [/mundo, mobile] LCP warning in console: `Image with src "/assets/island-wine.webp" was detected as the Largest Contentful Paint (LCP). Please add the loading="eager"…` (same warning on /investigacion for `/assets/r-research.webp` and on /isla for `/assets/f-sawmill.webp`).

## /militar

- Passed: summary strip, missions "En el mar" with type badge, route, ships, troops, countdown and progress bar for both the attack and the transport, live update when the attack returned (card removed, "1 Lancero" back home, report badge).
- [minor] [/militar] While the Puerto is under construction the card still says "Sin puerto no hay barcos." with a "Hacé un Puerto" button · start building a Puerto, open /militar · expected "Puerto en obra, termina en …".

## /informes

- Passed: welcome report; battle report "Derrota" with troops, losses, wall, power and loot; transport report "Tus barcos llegaron a Polis EP6o" with cargo; "Nuevo" badges; nav badge clears after visiting.
- [minor] [/informes] The list is a narrow centered column (about 600 px) while every other page uses the full content width; looks misaligned under the full-width advisor banner.

## /investigacion

- Passed: four branches, costs, "Te faltan N puntos · llegás en …", locked prerequisites, research "Conservación" (toast "Investigación completa.", 501 to 471 points, warehouse cap 2.500 to 3.000 in the header tooltip).
- [minor] [/investigacion] "1 puntos" (singular not handled) in the header card.

## /tesoro

- Passed: store is open on devnet; shows ambrosía, wallet in use ("Llave de juego", short address, copy, explorer link), balance, packs, merchant. "Pedir SOL de prueba" (tried once for the local key): toast "Te mandamos 0,06 SOL de prueba. Ya podés comprar un pack.", balance updated to 0,06, link "Ver el envío en el explorador". No purchase attempted. For a player without the key in this browser it explains "No encontramos la billetera de tu cuenta (…) en este navegador".
- [minor] [/tesoro, mobile] "10 packs" wraps to two lines while "1 pack" and "5 packs" don't, so the three cards have different heights.
- [info] [/tesoro] Chrome's network panel showed `POST /tesoro 503` for the faucet server action while the dev log recorded `POST /tesoro 200 … claimFaucetAction() in 2105ms` and the UI succeeded. Same pattern for some `?_rsc=` requests. Likely an extension reporting artifact, listed only so nobody chases it twice.

## /ranking

- Passed: table, "Vas 2º de 10 arcontes", own row highlighted with "vos", rename with Enter (toast "Nombre actualizado.", header and row update at once).
- [minor] [/ranking] Too-short names fall back to the browser's native validation bubble ("Aumenta la longitud del texto a 3 caracteres como mínimo…", tuteo and browser wording). Use an inline message in voseo like the rest of the UI.

## /salir and auth

- Passed (headless, fresh context): "Jugar ahora" shows "Fundando tu polis…", lands in /ciudad/<id> in ~1.5 s, cookie `thalassa_session` is httpOnly, SameSite=Lax, 7 days. "Salir" clears the cookies and goes to /; /ciudad, /isla/14, /mundo, /militar, /informes, /tesoro, /investigacion, /ranking all redirect to /. "Jugar ahora" again logs back into the same city (key kept in localStorage). I did not click Salir in the shared Chrome profile because another agent was using the same session cookie in another tab.
- [minor] [/] A logged-in player who opens / sees the marketing page with "Jugar ahora" and the copy "Te creamos una llave de juego…", even though the key and session already exist. Expected "Volver a mi polis" (or a redirect).
- [info] [/salir] Salir keeps the game key in localStorage, so on a shared computer anyone can press "Jugar ahora" and get back into the account. Fine for devnet; consider saying so or offering "Olvidar esta llave".

## Console / server log summary

- [major, appears fixed] [header ResourceBar, all game routes] Hydration mismatch logged by a browser on /ranking: `Hydration failed because the server rendered text didn't match the client` at `ResourceBar (src/components/game/resource-bar.tsx:71)`, gold `1.589` vs `1.588` (value computed from the clock during render). During the fix the log also showed `ReferenceError: useServerClock is not defined` (mid-edit). After `useServerClock` landed, 8 reloads across /ranking, /ciudad, /militar, /isla, /investigacion, /tesoro showed no hydration errors. Re-check once more before shipping.
- [major, unverified source] [/ciudad] Dev log has 4x `Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node'` from a browser on /ciudad/1b717eb0… around the same time; usually the aftermath of a hydration mismatch or of a browser extension mutating the DOM. Not reproduced afterwards.
- No console errors in my Chrome tab during the whole play-through; no failed requests other than the 503 artifact above; no broken images; no horizontal scroll on any route at 1280 or 375; no em dash and no English leftovers in visible text, aria-labels, titles or placeholders (scripted scan of 21 route/panel combinations).
