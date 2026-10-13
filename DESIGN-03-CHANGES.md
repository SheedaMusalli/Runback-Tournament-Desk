# Runback Design 03 — 13 October 2026

Use Runback Tournament Desk Setup 2026-10-13-design03.exe. The sidebar displays DESIGN 03 · CONNECTED BRACKETS.

This build replaces the organizer's stacked bracket cards with compact connected match boxes. Winners, losers and finals occupy separate bands. Scores won are green; seed numbers and match IDs remain visible. Click a playable set for score controls and P1/P2 switching. Zoom controls include Fit all. The public bracket uses the same layout.

The event picker now has a searchable panel, full event names, player counts, event status, history access and a create action. It remembers the selected event after reload.

The tournament desk, registration table, queue, history, operations, Discord guide, event setup, dialogs, player library, manual broadcast, overlay source cards, settings, about and loading screens share the new visual system. Light/dark appearance is respected. Tools are visible in navigation groups.

The public bracket API now snapshots NodeCG's observable data before reading it. The old runtime's wrapped arrays do not implement find(), which caused the HTTP 500 behind the broadcast failure. The fix was verified against the running NodeCG 1.9.0 server, not only a mock API.

Validation: production frontend and extension builds; geometry tests across 15 size/format combinations up to 512 players; public API and wrapper regression tests; 18 tournament simulations and 2710 reported matches; operations suite. Browser checks covered event search/selection/reload, connected sections, zoom, side swap, score reporting, public rendering/filtering, desktop/mobile layout, light/dark mode and the native loading window size.

Install: export any current event backups, close Runback, run the Design 03 installer, and launch Runback. Check the sidebar build label. Browser dashboards opened previously may need Ctrl+F5. The installer was built and its packaged files checked; installation over your existing app was not performed automatically.

A shared bracket still requires Runback running. A localhost URL is only for this computer; remote viewers require your existing public server address or tunnel.

Build by Sheeda Talli. Original Runback by Opeik. The source changes are in this folder's src directory; previews are under previews/design03.
