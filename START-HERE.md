# Runback Tournament Desk — start here

This edition replaces the default dashboard with a tournament organizer. The original overlay and broadcast tools remain available under **More tools**.

## The quick path

1. **Create an event.** Choose Local weekly for a straightforward double-elimination event, or review one of the format presets.
2. **Add players.** Type individual names, paste a list, upload CSV/TXT, or import the saved player library. CSV columns are `name,team,country,discord_id`; team, country and Discord ID are optional. A Discord user ID is used only when you set up the optional companion described below.
3. **Check in and seed.** Mark arriving players as Here. Click their seed number to move them. Use Edit to correct names before starting.
4. **Generate the bracket.** Only checked-in players enter. Review the count and format in the confirmation. Entrants and rules lock after generation.
5. **Run matches.** Open a ready match, select a station, and Call players. Occupied stations cannot be assigned twice across this workspace.
6. **Broadcast.** Select Send to OBS. Save live score after each game; Report result advances the bracket only after confirmation.
7. **Finish and export.** Final standings appear after the champion is decided. Export CSV and an event backup.

Try a sample event creates a separate, clearly named example with fictional entrants. It is not historical tournament data.

## What it can organize

- 2–512 checked-in entrants in seeded single or double elimination.
- Automatic byes, loser advancement, grand-final reset, and tied placements.
- Configurable games-to-win and longer-set thresholds: final three matches, Top 4, or Top 8.
- A fixed 32-player EWC-inspired format: eight four-player GSL groups, four four-player GSL groups, then an eight-player single-elimination playoff.
- Multiple saved events, up to 64 named stations per event, search, pagination, bracket views and event checklists.
- Forfeits with a required reason, live scores, final-result confirmation and undo of the latest reported result.
- Local persistence, revision checks for concurrent operator windows, JSON backup/restore and CSV final standings.

The primary navigation is **Overview → Players → Match queue → Bracket → Stream → Results**. Overview shows the next useful action. Less frequently used rules are inside Advanced format settings.

## New: Operations and event library

The main Overview has a new event banner and progress meter. **Operations** keeps the extra tools together so normal match work stays simple:

- **Run of show:** add timed blocks with a lead and optional station reservations. Overlapping reservations are rejected across all events. Times display in the browser's named timezone and are stored as UTC. Start a block, then mark it complete. Remove and recreate a planned block to change it. These blocks do not generate separate bracket pools or call matches automatically.
- **Print / save PDF:** prints a clean schedule for staff. Choose Save as PDF in the browser print dialog.
- **Stations & calls:** see matches on physical stations across the workspace. Take an idle station offline for maintenance; assignments are blocked until reopened. Release an active match before marking its station offline.
- **Player call clock:** choose a ready/playing set and a 1–30 minute window. Its deadline persists through refresh. Five minutes is an editable starting value inspired by a specific event's published policy, not a universal Tekken rule. Expiry never awards a forfeit; open the match and review it yourself.
- **Stream plan:** queue and reorder ready/playing sets. Open a queued match to send it to OBS. This is a planning list, not a match hold or automatic broadcast switcher. Finished sets disappear from the active list.
- **Notes & incidents:** record a ruling or equipment problem, assign an owner, optionally link a match, and resolve/reopen it.

## Discord bridge API

Runback includes an optional, locally authenticated Discord bridge used by a separately maintained companion bot. This repository covers the Runback desktop software and its bridge endpoint; it does not include the companion bot or Discord credentials. The bridge remains disabled until an administrator configures its secret in NodeCG's `cfg/runback.json`.

Operations data is included in JSON backups. Restore retains schedule titles/times/leads and incident content/status. Live blocks become planned. Station reservations, maintenance marks, call timers and stream plans are cleared on the restored copy to avoid resuming the original room state; remove and recreate planned blocks to reserve stations again. Restored incident timestamps reflect the import time. Existing events without operations data continue to work.

**Event library** contains 40 selected references across 2024–2026, searchable by name, location and idea, with year and specific-lesson filters. Thirty-one entries come from the announced 2025 World Tour schedule; those are discovery references, not verified rule profiles or proof of completion. The remaining examples link to rules, formats, listings or recaps. Read each evidence note before adapting it.

This is a researched snapshot, not every Tekken 8 event ever held. Local weeklies and private events have no exhaustive public archive. Links to the official circuit and the public Tekken 8 event directory are provided for continued discovery. Lessons are design interpretations, not endorsements. No event results or player records are automatically synchronized.

## Format presets

Seven presets are included: Local weekly, EVO-style open bracket, EVO Japan 2026, CEO 2026, TWT 2026 Dojo-style, EWC 2025-inspired, and Quick knockout. Five draw on cited event/circuit sources; two are custom defaults. Open Format library to read the summary and original source.

See RESEARCH.md for the evidence and implementation differences. This is a curated set of useful formats, not a database of every historical tournament. No official results, registration accounts, rankings, or private competitor information have been imported.

## Score, result and round wins are different

The operator enters **games won in the set**. Save live score updates the selected OBS match without advancing the bracket. Report result records the set winner and advances the tournament. A normal result requires exactly one player to reach the set's first-to target; ties and impossible scores are rejected.

Tekken itself displays round-win circles. The HUD-safe overlay still leaves the full y=46–149 strip transparent on a 1920 × 1080 canvas. Tournament-stage text is below the timer. Double-elimination grand finals show W/L; a reset shows L/L.

## P1/P2 sides and sharing the bracket
In **Match queue** or **Bracket**, use **Switch sides** to exchange who is P1 and P2. It is available before and during a match. The game scores move with the players, and a selected OBS match updates to the new player order. Completed sets are locked.

Use **End tournament** in the top bar whenever you want to stop an event, including before generating its bracket. Confirm the prompt to end it. This preserves the event and its results, releases active stations and blocks further edits. The ended-event banner lets you resume it; use **+ New event** to start a separate test.

Use **Delete event** in the top bar to permanently remove the selected tournament and its players, bracket, schedule, results and history. The confirmation names the event and recommends exporting a backup first. Other saved tournaments remain in the event selector. This action cannot be undone.

**More tools → App settings** contains display preferences, commentator mirroring, player-name transliteration, live dashboard updates, the Start.gg API key and default country. The About page and application navigation credit the Tekken 8 tournament build to **Sheeda Talli** and the original Runback project to **Opeik**.

In **Bracket**, use **Share this live bracket** to copy a read-only page URL. Paste it into Discord or any browser. It refreshes with current rounds and scores. The public page only returns player names and bracket data; it does not expose Discord IDs or admin controls. A link beginning with `localhost` or `127.0.0.1` only works on the organizer's computer. For remote viewers, put the Runback server behind a reachable public hostname or secure tunnel and enter that public origin in **Public server URL** first. The organizer's computer and Runback must remain online while people view the live page.

OBS URL: `http://localhost:9090/bundles/runback/graphics/scoreboard.html`

Use **1920 × 1080, 60 FPS**. Align it with the game capture; do not crop or stretch independently. `?stageY=180` moves only the stage tag down. Keep the application running. Check alignment on your actual Tekken HUD before a broadcast.

## Corrections and backups

- Before bracket generation: edit entrants, change seeding, check-in, rules and stations.
- After generation: Results → Undo latest result reverses the newest recorded result. If a dependent match has been called, release it first. Repeat undo in reverse order for earlier corrections.
- A forfeit applies to the current set. In double elimination, a player who forfeits on winners side still moves to losers side; for a full-event disqualification, record the later forfeit too.
- Export backup saves the selected event, entrants, scores and result history as JSON.
- Restore creates a separate event. It validates and rebuilds the bracket, replays reported results and restores pending scores. Station calls and stream selection are cleared; assign stations again. Existing events remain intact.
- Events are stored by NodeCG in its local database. Closing the browser does not delete them. Keep a separate backup of NodeCG's database/configuration when moving the installation.
- Multiple windows share one organizer. If another window changes data while a score edit is open, reopen the match and review its latest scores before saving. A server timeout can mean the write succeeded; refresh to check before retrying.

Manual broadcast controls can also change the OBS scoreboard. During an organized match, use the organizer's score controls to keep the bracket record and overlay consistent. Manual edits are not imported back into match results.

## Install into the existing app

This folder includes source and compiled `dashboard`, `graphics`, and `extension` folders. It is not a Windows installer.

1. Close Runback and back up the whole original bundle and NodeCG data.
2. In the original Electron layout, locate `resources/lib/nodecg/bundles/runback` inside the app directory (possibly under `win-unpacked`). Other forks may use a different layout.
3. Replace **all three** compiled folders: `dashboard`, `graphics`, and `extension`. Also copy the bundle's `configschema.json` into the bundle root. The organizer and Discord bridge require the updated server extension as well as the dashboard. Keep the existing installed dependencies and database/configuration.
4. Restart Runback and refresh any OBS browser sources.

Built against this archive's Runback 0.4.2 and NodeCG 1.9.0. Different forks need compatibility checking. Your existing player library remains available; import it into an event explicitly.

## Build / run from source

Prerequisites: Git, Node.js and npm. Tested on Windows using Node 24.20.0 and npm 11.19.0.

```powershell
git clone --branch legacy-1.x https://github.com/nodecg/nodecg.git nodecg
cd nodecg
git checkout 0c6ae8209e2558758de10f21a88b6f6208382108
npm.cmd install --omit=dev --legacy-peer-deps
```

Copy this folder to `nodecg/bundles/runback` (the final name must be `runback`). From NodeCG:

```powershell
cd bundles/runback
npm.cmd ci --legacy-peer-deps
$env:NODE_OPTIONS = '--openssl-legacy-provider'
npm.cmd run build
node tests/organizer.cjs
Remove-Item Env:NODE_OPTIONS
cd ../..
node index.js
```

Open `http://localhost:9090/bundles/runback/dashboard/runback.html?standalone=true`.
Close the other Runback instance if 9090 is already occupied. Opening the HTML directly from disk does not connect to NodeCG.

## Build the Windows .exe

The original developer's Electron wrapper is a separate project. Run from this folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-Windows.ps1
```

The script creates a new timestamped directory, checks out pinned wrapper/NodeCG versions, copies this source, installs and builds dependencies, and packages an unsigned NSIS installer without publishing.

Expected installer location: `windows-build-<timestamp>/runback-electron/dist/`.

The packaging command in the wrapper directory is:

```powershell
.\node_modules\.bin\electron-builder.cmd --win nsis --x64 --publish never
```

Add `--dir` for an unpacked executable; keep the entire `win-unpacked` folder together. Avoid upstream `npm run dist`, which asks to publish automatically.

**The installer build and native Electron launch were not tested.** The original wrapper uses Electron 10.1.4. The script was syntax-checked; this is a compatibility build route, not an Electron modernization. Browser/server builds and live browser tests passed.

## Verification and current boundaries

Automated engine tests ran 17 full tournaments and 2,648 reported sets, including 512 entrants, non-power-of-two brackets, double elimination, reset finals, GSL stages, standings, invalid scores, forfeits, conflicts, undo and backup replay. Browser tests covered creation through champion, CSV, seeding, OBS, restart/reload persistence, exports, restore, undo and concurrent edit rejection. Preview screenshots show sample/QA data only.

No actual OBS application capture, native installer or live tournament deployment was tested. The old dependency stack still emits deprecation and Vuetify CSS-order warnings; the rendered pages were inspected.

This edition does not implement online registration/payment collection, role-based staff accounts, start.gg result synchronization, a full official tournament-results archive, circuit ranking calculations, Swiss/round-robin formats, or multi-phase EVO pool consolidation. EVO/TWT presets use one continuous bracket. The EWC-inspired preset uses documented stage sizes and lengths with Runback seeding/crossover policy; it is not an official event draw.

The desk uses a dark event-operations theme. Original settings and other broadcast tools remain under More tools. GPL-3.0 and original attribution are preserved.
