# Tournament research → implemented features

Research checked 3 October 2026. The goal was to identify repeatable organizing workflows and format differences, not to claim coverage of every tournament ever held.

| Reference | Format detail used | Implementation |
| --- | --- | --- |
| [EVO general tournament rules](https://evo.gg/rules/) | Double elimination; general FT2 sets and FT3 winners/losers/grand finals; registration and pool check-in roles | EVO-style preset, two-loss progression, check-in, stations, reset final. One continuous bracket; no separate pool consolidation. |
| [EVO Japan 2026 TEKKEN 8 rules](https://www.evojapan.gg/en/rules/tk8) | FT2 before Top 8; FT3 in Top 8 | Dated preset with longer-set threshold. Controller and character rules remain operator responsibilities. |
| [CEO 2026 TEKKEN 8 rules](https://ceogaming.org/tournament/t8/) | Double elimination; FT3 Top 8 | CEO preset; source link includes the event's separate coaching rules. |
| [TWT 2026 official rules](https://www.bandainamcoent.com/legal/community-events/official-rules-twt) | Dojo/Challenger longer sets at Top 4, with a pre-event Top 8 option | TWT Dojo-style preset and editable threshold. No event certification or circuit points. |
| [NAVI EWC 2025 tournament report](https://navi.gg/en/tournaments/esports-world-cup-2025-tekken-8/news) | Eight GSL groups of four → four GSL groups of four → eight-player knockout; FT2 groups, FT5 playoffs | EWC-inspired 32-player preset with automatic qualification. Initial snake seeding and fixed crossover pairing are Runback decisions; no third-place playoff. |

The event rules and participant report are linked directly in the app. Local weekly and Quick knockout are explicitly custom presets. Users may edit set lengths before bracket generation, so an event can diverge from its starting template.

The UI separates three decisions: **Call players** assigns a physical station, **Save live score** updates the broadcast, and **Report result** advances the competition. This reduces accidental bracket progression during live scoring. The overview exposes the next actionable match and free stations; registration and advanced rules have their own screens.

EWC evidence is attributed to a participating team's tournament report, not presented as an official EWC rulebook. A secondary pre-event article had inconsistent participant counts and a conflicting third-place note, so those details were not adopted. COMBO BREAKER's rules pages could not be retrieved reliably during this research; no unverified COMBO BREAKER-specific preset was added.

Historical champions, private entrant data, qualifier slots, prize distributions and live rankings are not preloaded. The demonstration event uses fictional names. Official requirements and formats can change; check the linked edition before using a preset in a sanctioned competition.
# Expanded event research — 3 October 2026

The in-app Event library has 40 selected references. It deliberately distinguishes published schedule entries from researched operational examples. It is not exhaustive and does not claim all scheduled tournaments occurred unchanged.

- [Bandai Namco's 2025 circuit announcement](https://www.bandainamcoent.com/news/tekken-world-tour-2025-event-schedule-announced): 31 Master+, Master and Challenger entries, including the three EVO events, Combo Breaker, CEO, TGU, TAKEDOWN and regional events. Used for discovery only; no per-event rules invented.
- [2024 tour launch](https://en.bandainamcoent.eu/tekken/news/tekken-world-tour-2024-starts-13th-april-2024-registrations-now-opened-new-details) and [2024 finals recap](https://www.bandainamcoent.com/news/tekken-8-crowns-first-tekken-world-tour-champion): season-specific references and the need to preserve event closeout records.
- [Red Bull Golden Letters 2024 match list](https://www.redbull.com/gb-en/events/golden-letters/golden-letters-match-list): special Perfect/Great tracking illustrates why unusual rules should not silently inherit a normal elimination preset. This scoring mode is not implemented.
- [Fantasy Basel 2026 organizer listing](https://www.start.gg/tournament/fighting-games-at-fantasy-basel-2026/event/tekken-8/overview): additional five-minute missing-player window informed the configurable call clock. We leave the final no-show decision to the operator.
- [TNS #133 event listing](https://www.start.gg/tournament/tns-tekken-8-133/events): timed stages and a separate redemption listing informed the run-of-show view. The listing has inconsistent redemption dates, so those dates are not imported. No automatic redemption transfer is implemented.
- [DOWNPLAY 3](https://www.start.gg/tournament/downplay-3/events): staged pools and finals informed schedule blocks with named leads. These are logistical blocks, not automatic pool-to-finals qualification.
- EVO Japan 2026, CEO 2026 and EWC 2025 references above remain the basis for format features. Station maintenance, stream ordering and incident tracking are our product design decisions for the needs these event workflows reveal, not claims about the organizers' internal software.

The official [current tour](https://tekkenworldtour.com/) and [Tekken 8 community event directory](https://www.start.gg/search/tournaments?refinementList%5Bevents.videogame.id%5D=49783) are linked inside the library. This build does not calculate official circuit rankings, register a Dojo or scrape personal entrant data.
