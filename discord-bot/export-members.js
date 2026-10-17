const fs = require('node:fs')
const path = require('node:path')
const { Client, Events, GatewayIntentBits } = require('discord.js')
const { membersForRole, playerCsv } = require('./player-export')

const token = process.env.DISCORD_TOKEN || ''
const guildId = process.env.DISCORD_GUILD_ID || ''
const roleId = process.env.DISCORD_EXPORT_ROLE_ID || ''
const outputPath = path.join(__dirname, 'tournament-players.csv')

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

async function exportMembers() {
  if (!token || !guildId || !roleId) {
    throw new Error('Set DISCORD_TOKEN, DISCORD_GUILD_ID, and DISCORD_EXPORT_ROLE_ID in .env first.')
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] })
  try {
    const ready = new Promise(resolve => client.once(Events.ClientReady, resolve))
    await client.login(token)
    await ready

    const guild = await client.guilds.fetch(guildId)
    await guild.roles.fetch()
    const role = guild.roles.cache.get(roleId)
    if (!role) throw new Error('DISCORD_EXPORT_ROLE_ID was not found in DISCORD_GUILD_ID.')

    const members = await guild.members.fetch({ force: true })
    const entrants = membersForRole(members, roleId)
    fs.writeFileSync(outputPath, playerCsv(entrants), 'utf8')
    console.log(`Server: ${guild.name}`)
    console.log(`Role: ${role.name} (${role.id})`)
    console.log(`Exported ${entrants.length} human members to ${outputPath}`)
    if (entrants.length) console.log(`Name preview: ${entrants.slice(0, 8).map(member => member.nickname || member.user.globalName || member.user.username).join(', ')}`)
    else console.warn('No human members have this role. Check the selected role and enable Server Members Intent in the Discord Developer Portal.')
  } finally {
    client.destroy()
  }
}

if (require.main === module) {
  exportMembers().catch(error => {
    console.error(error.message || error)
    process.exitCode = 1
  })
}

module.exports = { csvCell: require('./player-export').csvCell }
