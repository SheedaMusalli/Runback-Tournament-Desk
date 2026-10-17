const fs = require('node:fs')
const path = require('node:path')
const {
  Client, GatewayIntentBits, REST, Routes, PermissionFlagsBits,
  MessageFlags, EmbedBuilder, AttachmentBuilder,
} = require('discord.js')
const { membersForRole } = require('./player-export')

const API = String(process.env.RUNBACK_API_URL || 'http://127.0.0.1:9090/runback-discord/api/v1').replace(/\/$/, '')
const SECRET = process.env.RUNBACK_API_SECRET || ''
const TOKEN = process.env.DISCORD_TOKEN || ''
const APP_ID = process.env.DISCORD_APPLICATION_ID || ''
const GUILD_ID = process.env.DISCORD_GUILD_ID || ''
const DEFAULT_CHANNEL = process.env.DISCORD_CHANNEL_ID || ''
const ADMIN_ROLES = new Set((process.env.RUNBACK_ADMIN_ROLE_IDS || '').split(',').map(x => x.trim()).filter(Boolean))
const INTERVAL = Math.max(1000, Math.min(15000, Number(process.env.POLL_INTERVAL_MS) || 2000))
const STATE_FILE = path.join(__dirname, '.runback-bot-state.json')
const eventChannels = parseEventChannels(process.env.RUNBACK_EVENT_CHANNELS_JSON || '{}')
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] })
let priorCalls = null
let polling = false
const lastManualCall = new Map()

function parseEventChannels(input) {
  try { const value = JSON.parse(input); return value && typeof value === 'object' && !Array.isArray(value) ? value : {} }
  catch (_) { console.warn('RUNBACK_EVENT_CHANNELS_JSON is invalid; using the default channel.'); return {} }
}

function escapeDiscord(value) {
  return String(value || '').replace(/[\\*_~`|>]/g, '\\$&').replace(/@/g, '@\u200b').slice(0, 120)
}

function chooseEvent(state, requested) {
  if (!state || !Array.isArray(state.events)) throw new Error('Runback has not returned tournament data yet.')
  const event = requested
    ? state.events.find(item => item.id === requested || item.name.toLowerCase() === requested.toLowerCase())
    : state.events[state.events.length - 1]
  if (!event) throw new Error('Choose a tournament that exists in Runback.')
  return event
}

function eventStandings(event) {
  if (!event.champion) return []
  const buckets = {}
  for (const match of event.matches || []) {
    if (match.status !== 'done' || !match.loser || !(match.eliminates || (match.section === 'Finals' && event.champion === match.winner))) continue
    ;(buckets[match.tier] ||= []).push(match.loser)
  }
  const ordered = [{ id: event.champion, place: 1 }]
  let rank = 2
  for (const tier of Object.keys(buckets).map(Number).sort((a, b) => b - a)) {
    const ids = buckets[tier].filter(id => !ordered.some(item => item.id === id))
    for (const id of ids) ordered.push({ id, place: rank })
    rank += ids.length
  }
  return ordered.map(item => ({
    ...item,
    wins: (event.matches || []).filter(match => match.status === 'done' && match.winner === item.id).length,
    losses: (event.matches || []).filter(match => match.status === 'done' && match.loser === item.id).length,
  }))
}

function playerName(event, id) {
  return (event.entrants.find(player => player.id === id) || {}).name || 'TBD'
}

function matchLabel(event, match) {
  return `${escapeDiscord(playerName(event, match.players[0]))} vs ${escapeDiscord(playerName(event, match.players[1]))}`
}

function linkedIds(event, match) {
  return [...new Set(match.players.map(id => (event.entrants.find(player => player.id === id) || {}).discordId).filter(id => /^\d{17,20}$/.test(String(id || ''))))]
}

function callPayload(event, match, reason = 'Players, please report now.') {
  const ids = linkedIds(event, match)
  const mentions = ids.map(id => `<@${id}>`).join(' ')
  const embed = new EmbedBuilder()
    .setColor(0xd6f58b)
    .setTitle(`${event.name} · ${match.id}`.slice(0, 256))
    .setDescription(`**${matchLabel(event, match)}**\n\n${escapeDiscord(reason)}\n\n**Station:** ${escapeDiscord(match.station || 'See tournament desk')}\n**Set:** First to ${match.ft} games · ${escapeDiscord(match.section)} · ${escapeDiscord(match.label)}`)
    .setFooter({ text: 'Runback Tournament Desk' })
  return {
    content: mentions || `Match call · ${matchLabel(event, match)}`,
    embeds: [embed],
    allowedMentions: { parse: [], users: ids, roles: [], repliedUser: false },
  }
}

function nextCalls(state) {
  const current = new Set()
  const result = []
  for (const event of state.events || []) {
    for (const match of event.matches || []) {
      if (match.status !== 'playing') continue
      const key = `${event.id}/${match.id}/${match.station || ''}`
      current.add(key)
      if (!priorCalls || !priorCalls.has(key)) result.push({ key, event, match })
    }
  }
  return { current, result }
}

async function api(pathname, options = {}) {
  if (!SECRET || SECRET.length < 64) throw new Error('Set a random 64-character RUNBACK_API_SECRET in discord-bot/.env and cfg/runback.json.')
  const response = await fetch(`${API}${pathname}`, {
    ...options,
    headers: { authorization: `Bearer ${SECRET}`, ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) },
    signal: AbortSignal.timeout(5000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Runback API returned ${response.status}.`)
  return data
}

async function getState() { return api('/state') }

async function execute(event, action, data = {}) {
  const latest = await getState()
  if (!latest.events.some(item => item.id === event.id)) throw new Error('This event was removed or restored. Run the command again.')
  return api('/command', { method: 'POST', body: JSON.stringify({ revision: latest.revision, eventId: event.id, action, data }) })
}

function channelFor(event) { return eventChannels[event.id] || DEFAULT_CHANNEL }

async function sendCall(event, match, reason) {
  const channelId = channelFor(event)
  if (!channelId) throw new Error('Set DISCORD_CHANNEL_ID in discord-bot/.env or add this event to RUNBACK_EVENT_CHANNELS_JSON.')
  const channel = await client.channels.fetch(String(channelId))
  if (!channel || !channel.isTextBased() || !channel.send) throw new Error('The configured call channel is unavailable or cannot receive messages.')
  if (channel.guildId !== GUILD_ID) throw new Error('The configured call channel must belong to DISCORD_GUILD_ID.')
  await channel.send(callPayload(event, match, reason))
}

function persistCalls(calls) {
  const tmp = `${STATE_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ activeCalls: [...calls] }), { mode: 0o600 })
  fs.renameSync(tmp, STATE_FILE)
}

async function pollCalls() {
  if (polling || !client.isReady()) return
  polling = true
  try {
    const state = await getState()
    const { current, result } = nextCalls(state)
    if (!priorCalls) {
      const saved = loadCalls()
      const announceExisting = String(process.env.ANNOUNCE_EXISTING_MATCHES_ON_START).toLowerCase() === 'true'
      priorCalls = new Set()
      for (const item of result) {
        if (announceExisting && !saved.has(item.key)) {
          await sendCall(item.event, item.match)
          await delay(1200)
        }
        priorCalls.add(item.key)
      }
      persistCalls(current)
      return
    }
    for (const item of result) {
      if (priorCalls.has(item.key)) continue
      const manualKey = `${item.event.id}/${item.match.id}`
      if (Date.now() - (lastManualCall.get(manualKey) || 0) < 5 * 60 * 1000) {
        priorCalls.add(item.key)
        continue
      }
      await sendCall(item.event, item.match)
      priorCalls.add(item.key)
      await delay(1200)
    }
    priorCalls = current
    persistCalls(current)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Runback poll/call failed:`, error.message || error)
  } finally { polling = false }
}

function loadCalls() {
  try { const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); return new Set(saved.activeCalls || []) }
  catch (_) { return new Set() }
}
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

const withEvent = sub => sub.addStringOption(o => o.setName('event').setDescription('Tournament (defaults to the newest event)').setAutocomplete(true).setRequired(false))
const withMatch = sub => sub.addStringOption(o => o.setName('match').setDescription('Ready match ID').setAutocomplete(true).setRequired(true))
const withPlayer = sub => sub.addStringOption(o => o.setName('player').setDescription('Runback entrant').setAutocomplete(true).setRequired(true))

function buildRunbackCommand() {
  const { SlashCommandBuilder } = require('discord.js')
  return new SlashCommandBuilder().setName('runback').setDescription('Tournament tools for Runback')
    .addSubcommand(s => withEvent(s.setName('status').setDescription('Event and live floor status')))
    .addSubcommand(s => withEvent(s.setName('matches').setDescription('List ready and playing matches')))
    .addSubcommand(s => withEvent(s.setName('schedule').setDescription('Show the next run-of-show blocks')))
    .addSubcommand(s => withEvent(s.setName('standings').setDescription('Show completed tournament placements')))
    .addSubcommand(s => withEvent(s.setName('checkin').setDescription('Check yourself in to this event')))
    .addSubcommand(s => withEvent(s.setName('link').setDescription('Link your Discord account to an entrant').addStringOption(o => o.setName('player').setDescription('Your exact tournament tag').setMaxLength(64).setRequired(true))))
    .addSubcommand(s => withEvent(withMatch(s.setName('call').setDescription('Staff: ping both players in the call channel')).addIntegerOption(o => o.setName('minutes').setDescription('Start or reset the call clock').setMinValue(1).setMaxValue(30).setRequired(false))))
    .addSubcommand(s => withEvent(s.setName('result').setDescription('Staff: record the final games score').addStringOption(o => o.setName('match').setDescription('Ready match ID').setAutocomplete(true).setRequired(true)).addIntegerOption(o => o.setName('score_a').setDescription('Games won by player shown first').setMinValue(0).setMaxValue(9).setRequired(true)).addIntegerOption(o => o.setName('score_b').setDescription('Games won by player shown second').setMinValue(0).setMaxValue(9).setRequired(true))))
    .addSubcommand(s => s.setName('help').setDescription('Explain player linking and staff commands'))
    .addSubcommandGroup(g => g.setName('admin').setDescription('Administrator tournament tools')
      .addSubcommand(s => s.setName('export-members').setDescription('Download a CSV of human members with a selected entrant role').addRoleOption(o => o.setName('role').setDescription('Opt-in tournament entrant role').setRequired(true)))
      .addSubcommand(s => withEvent(s.setName('export-roster').setDescription('Download this event’s roster as a CSV')))
      .addSubcommand(s => withEvent(withPlayer(s.setName('link').setDescription('Link an entrant to a Discord member')).addUserOption(o => o.setName('user').setDescription('Discord account to link').setRequired(true))))
      .addSubcommand(s => withEvent(withPlayer(s.setName('checkin').setDescription('Check in or undo check-in for an entrant')).addBooleanOption(o => o.setName('checked').setDescription('True to check in; false to undo check-in').setRequired(true))))
    )
}

function buildPingCommand() {
  const { SlashCommandBuilder } = require('discord.js')
  return new SlashCommandBuilder().setName('ping').setDescription('Check whether the Runback bot is responding')
}

async function respond(interaction, content) {
  const text = String(content || 'Done.').slice(0, 1950)
  if (interaction.deferred || interaction.replied) return interaction.editReply({ content: text, allowedMentions: { parse: [] } })
  return interaction.reply({ content: text, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } })
}

function isStaff(interaction) {
  if (interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) return true
  const roles = interaction.member && interaction.member.roles
  const roleIds = Array.isArray(roles) ? roles : roles && roles.cache ? [...roles.cache.keys()] : []
  return roleIds.some(id => ADMIN_ROLES.has(id))
}

function isAdmin(interaction) {
  return Boolean(interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.Administrator))
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function csvFile(rows, filename) {
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
  const buffer = Buffer.from(csv, 'utf8')
  if (buffer.length > 8 * 1024 * 1024) throw new Error('CSV is larger than 8 MB. Choose a smaller entrant role or export the event roster instead.')
  return new AttachmentBuilder(buffer, { name: filename })
}

function describeMatch(event, match) {
  const station = match.station ? ` · ${match.station}` : ''
  return `${match.id} · ${matchLabel(event, match)} · FT${match.ft} · ${match.status}${station}`
}

async function autocomplete(interaction) {
  const state = await getState()
  const focused = interaction.options.getFocused(true)
  if (focused.name === 'event') {
    return interaction.respond((state.events || []).slice(-25).map(e => ({ name: `${e.name} · ${e.entrants.length} entrants`.slice(0, 100), value: e.id })))
  }
  if (focused.name === 'match') {
    const event = chooseEvent(state, interaction.options.getString('event'))
    const matches = (event.matches || []).filter(m => ['ready', 'playing'].includes(m.status)).slice(0, 25)
    return interaction.respond(matches.map(m => ({ name: `${m.id} · ${matchLabel(event, m)}`.slice(0, 100), value: m.id })))
  }
  if (focused.name === 'player') {
    const event = chooseEvent(state, interaction.options.getString('event'))
    const query = String(focused.value || '').toLocaleLowerCase()
    return interaction.respond((event.entrants || []).filter(p => p.name.toLocaleLowerCase().includes(query)).slice(0, 25).map(p => ({ name: p.name.slice(0, 100), value: p.name })))
  }
  return interaction.respond([])
}

async function handleInteraction(interaction) {
  try {
    if (interaction.isAutocomplete()) return await autocomplete(interaction)
    if (!interaction.isChatInputCommand()) return
    if (interaction.commandName === 'ping') {
      return respond(interaction, `Pong! Runback bot is responding. Discord gateway ping: ${client.ws.ping} ms.`)
    }
    if (interaction.commandName !== 'runback') return
    if (interaction.guildId !== GUILD_ID) return respond(interaction, 'Use this bot in its configured tournament server.')
    const group = interaction.options.getSubcommandGroup(false)
    const sub = interaction.options.getSubcommand()
    if (group === 'admin') {
      if (!isAdmin(interaction)) return respond(interaction, 'This command is for Discord server administrators only.')
      if (sub === 'export-members') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        const role = interaction.options.getRole('role', true)
        const guild = interaction.guild || await client.guilds.fetch(GUILD_ID)
        if (role.guild.id !== guild.id) return respond(interaction, 'Choose a role from this tournament server.')
        if (role.id === guild.id) return respond(interaction, 'Choose a specific opt-in entrant role; @everyone includes every server member.')
        const members = await guild.members.fetch({ force: true })
        const entrants = membersForRole(members, role.id)
        const rows = [
          ['name', 'team', 'country', 'discord_id'],
          ...entrants.map(member => [member.nickname || member.user.globalName || member.user.username, '', '', member.id]),
        ]
        const slug = role.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entrants'
        const file = csvFile(rows, `runback-discord-${slug}-${new Date().toISOString().slice(0, 10)}.csv`)
        const preview = entrants.slice(0, 8).map(member => escapeDiscord(member.nickname || member.displayName || member.user.globalName || member.user.username)).join(', ')
        const previewText = preview ? ` Names: ${preview}${entrants.length > 8 ? ', …' : ''}.` : ' No human members were found; check the role assignment and Server Members Intent setting.'
        return interaction.editReply({ content: `Exported ${entrants.length} human members with the **${escapeDiscord(role.name)}** role.${previewText} Download the CSV below.`, files: [file] })
      }
      const state = await getState()
      const event = chooseEvent(state, interaction.options.getString('event'))
      if (sub === 'export-roster') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        const rows = [
          ['name', 'team', 'country', 'discord_id', 'seed', 'checked_in'],
          ...event.entrants.map((player, index) => [player.name, player.team, player.country, player.discordId, index + 1, player.checked ? 'yes' : 'no']),
        ]
        const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event'
        const file = csvFile(rows, `runback-roster-${slug}.csv`)
        return interaction.editReply({ content: `Exported ${event.entrants.length} entrants from **${escapeDiscord(event.name)}**.`, files: [file] })
      }
      if (sub === 'link') {
        const playerName = interaction.options.getString('player', true).trim()
        const player = event.entrants.find(p => p.name.toLocaleLowerCase() === playerName.toLocaleLowerCase())
        if (!player) return respond(interaction, 'Entrant not found. Choose a player from the suggestions or check the event.')
        const user = interaction.options.getUser('user', true)
        if (user.bot) return respond(interaction, 'Link a player to a human Discord account, not a bot.')
        await execute(event, 'linkDiscord', { name: player.name, discordId: user.id })
        return respond(interaction, `Linked **${escapeDiscord(player.name)}** to <@${user.id}>.`)
      }
      if (sub === 'checkin') {
        const playerName = interaction.options.getString('player', true).trim()
        const player = event.entrants.find(p => p.name.toLocaleLowerCase() === playerName.toLocaleLowerCase())
        if (!player) return respond(interaction, 'Entrant not found. Choose a player from the suggestions or check the event.')
        const checked = interaction.options.getBoolean('checked', true)
        await execute(event, 'checkin', { playerId: player.id, checked })
        return respond(interaction, `${checked ? 'Checked in' : 'Removed check-in for'} **${escapeDiscord(player.name)}**.`)
      }
    }
    if (sub === 'help') return respond(interaction, 'Players: /runback link, /runback checkin, /runback status, /runback matches, /runback schedule, /runback standings. Staff: /runback call and /runback result. Server administrators: /runback admin export-members, export-roster, link, and checkin. Use /ping to test Discord response.')
    const state = await getState()
    const event = chooseEvent(state, interaction.options.getString('event'))
    if (sub === 'status') {
      const ready = event.matches.filter(m => m.status === 'ready').length
      const playing = event.matches.filter(m => m.status === 'playing').length
      const linked = event.entrants.filter(p => p.discordId).length
      return respond(interaction, `**${event.name}** · ${event.champion ? `Champion: ${playerName(event, event.champion)}` : event.started ? 'In progress' : 'Registration'}\n${event.entrants.filter(p => p.checked).length}/${event.entrants.length} checked in · ${linked} linked · ${ready} ready · ${playing} on station.`)
    }
    if (sub === 'matches') {
      const matches = event.matches.filter(m => ['playing', 'ready'].includes(m.status))
      return respond(interaction, `**${event.name} · Matches**\n${matches.length ? matches.slice(0, 20).map(m => describeMatch(event, m)).join('\n') : 'No ready or playing matches.'}${matches.length > 20 ? `\n…and ${matches.length - 20} more.` : ''}`)
    }
    if (sub === 'schedule') {
      const items = ((event.operations && event.operations.sessions) || []).filter(s => s.status !== 'done').sort((a, b) => a.start.localeCompare(b.start)).slice(0, 12)
      return respond(interaction, `**${event.name} · Run of show**\n${items.length ? items.map(s => `${new Date(s.start).toLocaleString()} · ${escapeDiscord(s.title)} · ${s.status} · ${s.stations.join(', ') || 'No stations'}`).join('\n') : 'No upcoming schedule blocks.'}`)
    }
    if (sub === 'standings') {
      const placements = event.champion ? eventStandings(event) : null
      return respond(interaction, placements && placements.length ? `**${event.name} · Final standings**\n${placements.slice(0, 20).map(p => `${p.place}. ${escapeDiscord(playerName(event, p.id))} · ${p.wins}–${p.losses}`).join('\n')}` : 'Final standings appear once this event has a champion.')
    }
    if (sub === 'link') {
      const player = interaction.options.getString('player', true).trim()
      const target = event.entrants.find(p => p.name.toLocaleLowerCase() === player.toLocaleLowerCase())
      if (!target) return respond(interaction, `I couldn't find “${escapeDiscord(player)}” in ${event.name}. Check the exact player tag or ask an organizer.`)
      if (target.discordId && target.discordId !== interaction.user.id) return respond(interaction, 'That entrant is already linked. Ask an organizer to verify and change the account.')
      const result = await execute(event, 'linkDiscord', { name: target.name, discordId: interaction.user.id })
      return respond(interaction, `Linked your Discord account to **${escapeDiscord(target.name)}** for ${event.name}.`)
    }
    if (sub === 'checkin') {
      const matches = event.entrants.filter(p => p.discordId === interaction.user.id)
      if (matches.length !== 1) return respond(interaction, 'Link your account first with /runback link player:<exact tag>.')
      if (matches[0].checked) return respond(interaction, `You're already checked in as **${escapeDiscord(matches[0].name)}**.`)
      await execute(event, 'checkin', { playerId: matches[0].id, checked: true })
      return respond(interaction, `Checked in **${escapeDiscord(matches[0].name)}**. Good luck!`)
    }
    if (sub === 'call') {
      if (!isStaff(interaction)) return respond(interaction, 'A tournament organizer or server administrator must make match calls.')
      const match = event.matches.find(m => m.id === interaction.options.getString('match', true))
      if (!match || !['ready', 'playing'].includes(match.status)) return respond(interaction, 'That match is no longer ready to call. Refresh /runback matches.')
      const key = `${event.id}/${match.id}`
      if (Date.now() - (lastManualCall.get(key) || 0) < 30000) return respond(interaction, 'That match was just called. Wait 30 seconds before sending another reminder.')
      const minutes = interaction.options.getInteger('minutes') || 5
      await execute(event, 'ops:callStart', { matchId: match.id, minutes })
      await sendCall(event, match, 'Staff requested a player call. Please report to the desk.')
      lastManualCall.set(key, Date.now())
      if (match.status === 'playing') priorCalls && priorCalls.add(`${event.id}/${match.id}/${match.station || ''}`)
      return respond(interaction, `Call sent to ${channelFor(event)}. Linked players were mentioned.`)
    }
    if (sub === 'result') {
      if (!isStaff(interaction)) return respond(interaction, 'Only tournament staff can report match results.')
      const matchId = interaction.options.getString('match', true)
      const match = event.matches.find(m => m.id === matchId)
      if (!match || !['ready', 'playing'].includes(match.status)) return respond(interaction, 'That match is no longer ready to report. Refresh /runback matches.')
      const scoreA = interaction.options.getInteger('score_a', true)
      const scoreB = interaction.options.getInteger('score_b', true)
      await execute(event, 'report', { matchId, scores: [scoreA, scoreB] })
      return respond(interaction, `Result recorded for ${matchLabel(event, match)}: **${scoreA}–${scoreB}**. The bracket has advanced.`)
    }
  } catch (error) {
    console.error('Discord command failed:', error.message || error)
    if (interaction.isAutocomplete()) return interaction.respond([]).catch(() => {})
    return respond(interaction, error.message || 'Runback could not complete that command.').catch(() => {})
  }
}

async function start() {
  if (!TOKEN || !APP_ID || !GUILD_ID || !DEFAULT_CHANNEL || SECRET.length < 64) throw new Error('Fill DISCORD_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_ID, DISCORD_CHANNEL_ID, and RUNBACK_API_SECRET in .env.')
  const rest = new REST({ version: '10' }).setToken(TOKEN)
  await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), {
    body: [buildRunbackCommand().toJSON(), buildPingCommand().toJSON()],
  })
  client.on('interactionCreate', handleInteraction)
  client.once('ready', () => {
    console.log(`Runback Discord bot is online as ${client.user.tag}. Calls will post in guild ${GUILD_ID}.`)
    pollCalls()
    setInterval(pollCalls, INTERVAL)
  })
  client.on('error', error => console.error('Discord client error:', error.message || error))
  await client.login(TOKEN)
}

if (require.main === module) start().catch(error => { console.error(error.message || error); process.exitCode = 1; client.destroy() })

module.exports = { parseEventChannels, chooseEvent, eventStandings, escapeDiscord, linkedIds, matchLabel, callPayload, nextCalls, buildRunbackCommand, buildPingCommand }
