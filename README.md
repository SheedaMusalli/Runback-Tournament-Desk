# Runback Tournament Desk

**A Tekken 8 tournament organizer and broadcast desk, built on Runback.** Manage local events from player check-in through final standings, run matches, send scores to OBS, and share a live bracket.

> This is the Sheeda Talli tournament-focused edition of Runback. The original Runback project was created by Opeik (Sandro Stikić); the original broadcast tools remain included. Licensed under GPL-3.0.

[Download the latest Windows installer](https://github.com/SheedaMusalli/Runback-Tournament-Desk/releases/latest) · [Read the operator guide](START-HERE.md) · [View format research](RESEARCH.md)

## What you can do

- **Run an event:** keep multiple tournaments, track event status and history, and use an overview that points to the next task.
- **Register and check in players:** add names one by one, paste a list, import CSV/TXT, or reuse Runback's saved player library. Search, seed, and check entrants in before the bracket is made.
- **Build brackets:** run seeded single or double elimination for 2–512 entrants, with byes, loser advancement, grand-final resets, configurable set lengths, and a connected bracket view. Choose from seven format presets, including an EWC 2025-inspired 32-player group-to-playoff format.
- **Call and report matches:** assign stations, call players, switch P1/P2 sides, record live set scores, confirm results, undo the latest result, and handle forfeits with a reason.
- **Keep the event moving:** use the run of show, station status, player call timers, stream queue, staff notes, and incident tracking.
- **Broadcast:** send the selected match and score to Runback's OBS browser overlays. The Tekken 8 scoreboard leaves the game HUD area clear and keeps tournament stage information below the timer.
- **Share results:** publish a read-only live bracket link for viewers and export event backups or final standings.
- **Keep event history:** save multiple local events, reopen previous tournaments, and restore a JSON event backup as a separate event.

The app also retains Runback's player library, manual broadcast controls, commentator overlay, and display settings under **More tools**.

## Get the Windows app

1. Open the [latest release](https://github.com/SheedaMusalli/Runback-Tournament-Desk/releases/latest).
2. Download `Runback-Tournament-Desk-Setup-v0.4.2.exe` and run it.
3. Start Runback Tournament Desk from the installed app or Start menu.
4. Create an event, add and check in players, generate the bracket, then work through **Match queue → Bracket → Stream → Results**.

Windows may display a SmartScreen notice because this installer is not code-signed. Download it from this repository's Releases page. A SHA-256 checksum file is attached to the release for verification.

### First event, step by step

1. Choose **Create event** and a format preset. Use **Local weekly** for a standard double-elimination tournament.
2. Add players individually or import a list. Optional CSV fields are `team`, `country`, and `discord_id`.
3. Mark players as checked in and adjust their seed order.
4. Generate the bracket. Only checked-in players enter; the entrant list and rules lock for the active bracket.
5. Open a ready match, assign a station, and call the players. Switch P1/P2 if the players request sides.
6. Use **Send to OBS** and save each game's live score. **Report result** records the set and advances the bracket.
7. Review placements in Results, then export standings or an event backup.

Use **Try a sample event** to explore the workflow with fictional entrants. It does not represent historical tournament data.

## OBS and shared bracket

The scoreboard overlay is available at:

```text
http://localhost:9090/bundles/runback/graphics/scoreboard.html
```

Add it to OBS as a **Browser Source** at **1920 × 1080** and **60 FPS**. Keep Runback running. Check the overlay against your Tekken 8 capture and align the sources without cropping or stretching the scoreboard independently.

In **Bracket**, select **Share this live bracket** to copy a read-only URL. A `localhost` or `127.0.0.1` link works only on the organizer's machine. For remote viewers, configure **Public server URL** with a reachable public address or secure tunnel before sharing. Runback must remain online for the page to update.

## Optional Discord integration

Runback includes a locally authenticated bridge API that a separate Discord companion bot can use for match calls and results. **The companion bot, Discord bot token, and server credentials are not included in this repository.** The bridge is disabled until an administrator configures it. See [START-HERE.md](START-HERE.md) for the boundary and setup notes.

## Build from source

The repository contains the Runback bundle source, browser/extension build files, tests, and a Windows build script. It does not include NodeCG, the separate Electron wrapper project, or a prebuilt installer in the source tree.

Requirements: Windows, Git, Node.js/npm, and internet access for the pinned build dependencies. The source guide records the tested tool versions and compatibility notes.

```powershell
git clone https://github.com/SheedaMusalli/Runback-Tournament-Desk.git
cd Runback-Tournament-Desk
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-Windows.ps1
```

The script creates a timestamped build directory and packages an unsigned Windows installer; it does not publish a release. For the detailed NodeCG setup, tests, installer output location, compatibility limits, and troubleshooting, follow [START-HERE.md](START-HERE.md).

## Event formats and data boundaries

Presets include Local weekly, EVO-style open bracket, EVO Japan 2026, CEO 2026, TWT 2026 Dojo-style, EWC 2025-inspired, and Quick knockout. The Event Library is a curated set of event references and lessons, not a complete record of every Tekken 8 tournament ever held. Format inspiration is documented in [RESEARCH.md](RESEARCH.md); the EWC-inspired bracket is not an official event draw.

Events and player data are stored locally by NodeCG. Back up event data before moving installations. The app does not provide online registration or payments, official circuit rankings, Start.gg result synchronization, or a complete public tournament archive. The Discord bridge does not upload private player data unless an administrator configures and operates the separate bot.

## Credits and license

Runback was originally created by **Opeik (Sandro Stikić)**. This Tekken 8 tournament-focused edition and its redesign are by **Sheeda Talli**. Original attribution and notices are preserved in [NOTICES.md](NOTICES.md).

This project is distributed under the **GNU General Public License v3.0**. See [LICENSE.md](LICENSE.md).
