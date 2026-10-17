# Runback Discord companion: full Windows setup

This guide connects the Runback tournament desk to one Discord server. The bot announces a match in a call channel when an organizer assigns the match to a station. It mentions only competitors linked to that match. Players can link themselves and check in; staff can inspect matches, call players, and report results.

The Discord bot is a separate process from Runback. Runback's bundled Electron/Node runtime stays unchanged. The companion runs on the same computer using current Node.js and communicates with Runback through a private local API. It does not send messages until you configure your own Discord bot and start the companion.

## Before you begin

You need the updated Runback bundle installed, a Discord server where you can add a bot, and Node.js 24.17 or later on the computer that will run the companion. Check Node with `node --version`. The Discord companion needs this version; it does not change Runback's built-in Electron runtime.

If you still need to build the Runback installer, follow [the Windows build instructions in START-HERE](../START-HERE.md#build-the-windows-exe). Build and install Runback first. Keep the extracted package because it contains the `discord-bot` folder you will run separately.

## 1. Add the shared secret to Runback

Find the **NodeCG root**. It is the folder containing `index.js`, `bundles`, and `db`. In the build output shown in Explorer, it is the `lib\nodecg` folder. There may not be a `cfg` folder yet; create it beside `bundles` and `index.js`.

Open PowerShell in that NodeCG root and run:

```powershell
New-Item -ItemType Directory -Force .\cfg
notepad .\cfg\runback.json
```

Generate a private 32-byte secret with this Windows PowerShell-compatible command. It prints a 64-character hexadecimal value:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$secret = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
$secret
```

Copy the printed value into `runback.json`:

```json
{
  "discordApiSecret": "PASTE_THE_64_CHARACTER_SECRET_HERE"
}
```

If `runback.json` already has settings, preserve them and add `discordApiSecret` as another property. Keep the JSON commas and braces valid. Save the file and restart Runback.

**Use the right folder:** for a source or build copy, this is `<NodeCG root>\cfg\runback.json`. For an installed Windows app, it is `<Runback install>\resources\lib\nodecg\cfg\runback.json`; create `cfg` there if missing. Do not put it inside `bundles\runback` or the outer `runback-electron` folder.

## 2. Create and invite your Discord bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Open **Bot**, add a bot, and copy its token. Keep this token private. If it is ever exposed, reset it in the portal.
3. Open **OAuth2 → URL Generator**. Select the `bot` and `applications.commands` scopes. Select the bot permissions `View Channels`, `Send Messages`, and `Embed Links`; then open the generated URL and add the bot to your tournament server.
4. In the application’s **General Information**, copy the Application ID.
5. In Discord, enable **User Settings → Advanced → Developer Mode**. Right-click the tournament server and choose **Copy Server ID**. Right-click the text channel for calls and choose **Copy Channel ID**.

The bot uses the Guilds and privileged Server Members intents. Enable **Server Members Intent** on the app’s Bot page in the Developer Portal before starting the bot. This is used only to export members assigned to a role selected by an administrator; the bot does not collect email addresses or message history.

## 3. Configure and start the companion

In the extracted package, open the `discord-bot` folder. Copy its example environment file, then edit the new `.env`:

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill in the values below. `RUNBACK_API_SECRET` must exactly match `discordApiSecret` in Runback’s `cfg\runback.json`.

```dotenv
DISCORD_TOKEN=your_private_bot_token
DISCORD_APPLICATION_ID=your_application_id
DISCORD_GUILD_ID=your_server_id
DISCORD_CHANNEL_ID=your_call_channel_id
RUNBACK_API_URL=http://127.0.0.1:9090/runback-discord/api/v1
RUNBACK_API_SECRET=the_same_64_character_secret
```

Leave the other `.env.example` options at their defaults for a basic setup. If your NodeCG server uses a port other than `9090`, update the port in `RUNBACK_API_URL`. Keep Runback and the bot on the same computer when using the default `127.0.0.1` address.

From PowerShell in the `discord-bot` folder, install the bot packages and start it:

```powershell
npm.cmd install
npm.cmd start
```

The bot registers the `/runback` commands when it starts. You should see a message that it is online. Leave this window open during the tournament, and start Runback before starting the bot. To stop it, press `Ctrl+C`; start it again later with `npm.cmd start`. You do not need to run a separate deploy command for normal use.

## 4. Link players and call matches

Players link their own account in the server:

```text
/runback link player:<their exact Runback entrant name>
/runback checkin
```

Alternatively, organizers can add a Discord user ID in Runback’s player editor or import it as the fourth CSV column, `discord_id`. User IDs are numeric IDs, not Discord usernames.

To fill a roster from Discord, first create a server role such as **Tekken 8 Entrant** and give it only to players who opted into the tournament. Ask players to set their server nickname to their Tekken tag. In the Developer Portal, open the bot’s **Bot** page and enable **Server Members Intent**. Copy the entrant role ID with Developer Mode enabled, then set `DISCORD_EXPORT_ROLE_ID` in `.env`. From PowerShell in `discord-bot`, run:

```powershell
npm.cmd run export:players
```

This creates `tournament-players.csv` in the `discord-bot` folder with columns `name,team,country,discord_id`. The name comes from the member’s server nickname, falling back to their Discord display name or username; team and country are left blank. In Runback, choose **Players → Import a player list → Choose CSV / TXT** and select that file. The CSV parser accepts the `discord_id` column and links each entrant for match-call pings. Re-export after changing the entrant role or nicknames.

When a ready match is assigned to a station in Runback, the bot posts the matchup, station, and set information in the configured channel. It mentions only linked players. It does not use `@everyone`, role mentions, or DMs. Matches already playing when the bot first starts are suppressed by default; staff can call one manually with `/runback call`.

Use `/ping` to confirm the Discord bot is responding. This checks Discord only; Runback data commands also need the local bridge health check to pass. Players can use `/runback status`, `/runback matches`, `/runback schedule`, `/runback standings`, `/runback link`, `/runback checkin`, and `/runback help`. A server administrator can use `/runback admin export-members`, `export-roster`, `link`, and `checkin`. These administrator tools require the Discord Administrator permission. Staff can use `/runback call` and `/runback result`; to permit an organizer role for those two commands, copy its role ID and add it to `RUNBACK_ADMIN_ROLE_IDS` in `.env` as a comma-separated list. Restart the bot after changing `.env`.

`/runback admin export-members role:<role>` returns an ephemeral CSV attachment visible to the administrator who ran it. It includes human members with the chosen role, using server nickname (or Discord display name/username) and Discord user ID. Assign a dedicated opt-in entrant role before exporting. `/runback admin export-roster [event]` downloads the selected Runback event’s current player list, Discord links, seed positions, and check-in states. `/runback admin link player:<entrant> user:<member> [event]` links an unlinked Runback entrant to a Discord user on their behalf; it will not overwrite an existing link. `/runback admin checkin player:<entrant> checked:<true|false> [event]` checks a player in or reverses their check-in. These commands are useful when an entrant cannot run their own link or check-in command.

`/runback call` sends a reminder and starts or resets the Runback call clock. It defaults to five minutes; staff can choose 1–30 minutes. `/runback result` records the score and advances the bracket according to Runback’s normal result validation.

## Optional channel settings

By default, all event calls go to `DISCORD_CHANNEL_ID`. To route particular Runback event IDs to other channels, set `RUNBACK_EVENT_CHANNELS_JSON` in `.env` to a JSON object, for example:

```dotenv
RUNBACK_EVENT_CHANNELS_JSON={"event-id-one":"channel-id-one","event-id-two":"channel-id-two"}
```

Every destination channel must be in the configured Discord server and allow the bot to view and send messages. Existing playing matches are not announced on the first connection by default. `ANNOUNCE_EXISTING_MATCHES_ON_START=true` opts into calling existing on-station matches not already in the saved bot state. The default poll interval is two seconds; `POLL_INTERVAL_MS` accepts values from 1,000 to 15,000.

## Troubleshooting

- **`Runback Discord bridge is not configured` / HTTP 503:** `cfg\runback.json` is missing, has invalid JSON, or is in the wrong NodeCG root. Add the secret and restart Runback.
- **Unauthorized / HTTP 401:** the secret in `RUNBACK_API_SECRET` does not exactly match Runback’s `discordApiSecret`. Check for extra spaces or quotes and restart both processes.
- **Connection refused / fetch failed:** start Runback first. Confirm the port in `RUNBACK_API_URL` matches your NodeCG server, and that the bot is running on the same computer if using `127.0.0.1`.
- **`/runback` commands do not appear:** check that the bot was invited with both scopes, the application ID and server ID are correct, and the bot terminal reports it is online. Restart the bot after correcting `.env`.
- **A call does not appear:** confirm the bot has channel permissions, the player accounts are linked, the match was assigned to a station, and the match became active. For an already-playing match, ask staff to run `/runback call`.
- **Player is named but not pinged:** that entrant does not have a linked Discord user ID. Have them run `/runback link` or add their numeric ID in Runback.

## Keep credentials private

Do not share your bot token, `.env`, or bridge secret in screenshots, source control, or chat. The provided `.gitignore` excludes `.env` and the bot’s local state file. The API secret lets the companion read tournament and entrant data and send approved organizer actions through Runback.

The companion does not synchronize with a third-party tournament platform. A human still assigns stations and decides disputes. The bot never declares a forfeit or advances a match unless staff explicitly reports a result.
