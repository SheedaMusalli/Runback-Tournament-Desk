const { REST, Routes } = require('discord.js')
const { buildRunbackCommand, buildPingCommand } = require('./bot')

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Set ${name} in discord-bot/.env first.`)
  return value
}

async function main() {
  const applicationId = required('DISCORD_APPLICATION_ID')
  const guildId = required('DISCORD_GUILD_ID')
  const rest = new REST({ version: '10' }).setToken(required('DISCORD_TOKEN'))
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
    body: [buildRunbackCommand().toJSON(), buildPingCommand().toJSON()],
  })
  console.log(`Registered /ping and /runback in guild ${guildId}.`)
}

if (require.main === module) main().catch(error => { console.error(error.message || error); process.exitCode = 1 })
module.exports = { buildRunbackCommand, buildPingCommand }
