const test = require('node:test')
const assert = require('node:assert/strict')
const { buildRunbackCommand, callPayload, eventStandings, linkedIds, nextCalls } = require('./bot')
const { membersForRole, playerCsv } = require('./player-export')

function fixture() {
  const event = {
    id: 'event-1', name: 'Runback Open', champion: 'p1',
    entrants: [
      { id: 'p1', name: 'Player_One', discordId: '12345678901234567' },
      { id: 'p2', name: 'Player Two', discordId: '23456789012345678' },
      { id: 'p3', name: 'Unlinked' },
    ],
    matches: [
      { id: 'm1', players: ['p1', 'p2'], status: 'playing', station: 'P1', ft: 3, section: 'Winners', label: 'Round 1' },
      { id: 'm2', players: ['p2', 'p3'], status: 'ready', station: '', ft: 3, section: 'Losers', label: 'Round 1' },
    ],
  }
  return { id: 'event-1', revision: 4, events: [event] }
}

test('slash command schema registers the player and staff workflows', () => {
  const json = buildRunbackCommand().toJSON()
  assert.equal(json.name, 'runback')
  assert.deepEqual(json.options.map(option => option.name), ['status', 'matches', 'schedule', 'standings', 'checkin', 'link', 'call', 'result', 'help', 'admin'])
  assert.ok(json.options.find(option => option.name === 'call').options.some(option => option.name === 'minutes'))
  assert.deepEqual(json.options.find(option => option.name === 'admin').options.map(option => option.name), ['export-members', 'export-roster', 'link', 'checkin'])
})

test('match call mentions only linked competitors and disables broad mentions', () => {
  const event = fixture().events[0]
  const payload = callPayload(event, event.matches[0])
  assert.deepEqual(linkedIds(event, event.matches[0]), ['12345678901234567', '23456789012345678'])
  assert.equal(payload.content, '<@12345678901234567> <@23456789012345678>')
  assert.deepEqual(payload.allowedMentions, { parse: [], users: ['12345678901234567', '23456789012345678'], roles: [], repliedUser: false })
  assert.match(payload.embeds[0].data.description, /P1/)
})

test('call polling selects newly playing matches only', () => {
  const state = fixture()
  const first = nextCalls(state)
  assert.equal(first.current.size, 1)
  assert.equal(first.result.length, 1)
  assert.equal(first.result[0].match.id, 'm1')
})

test('standings follow Runback elimination tiers and omit entrants without a placement', () => {
  const event = fixture().events[0]
  event.matches = [
    { id: 'f', status: 'done', winner: 'p1', loser: 'p2', tier: 4, section: 'Finals', eliminates: true },
    { id: 's', status: 'done', winner: 'p2', loser: 'p3', tier: 3, section: 'Losers', eliminates: true },
  ]
  assert.deepEqual(eventStandings(event), [
    { id: 'p1', place: 1, wins: 1, losses: 0 },
    { id: 'p2', place: 2, wins: 1, losses: 1 },
    { id: 'p3', place: 3, wins: 0, losses: 1 },
  ])
})

test('player export includes only human members assigned the selected role', () => {
  const members = [
    { id: '2', nickname: 'Player B', user: { username: 'player-b', bot: false }, roles: { cache: new Set(['entrant', 'staff']) } },
    { id: '1', nickname: null, user: { globalName: 'Player A', username: 'player-a', bot: false }, roles: { cache: new Set(['entrant']) } },
    { id: '3', nickname: 'Staff only', user: { username: 'staff', bot: false }, roles: { cache: new Set(['staff']) } },
    { id: '4', nickname: 'Bot player', user: { username: 'bot', bot: true }, roles: { cache: new Set(['entrant']) } },
  ]
  const selected = membersForRole(members, 'entrant')
  assert.deepEqual(selected.map(member => member.id), ['1', '2'])
  assert.match(playerCsv(selected), /"name","team","country","discord_id"/)
  assert.match(playerCsv(selected), /"Player A","","","1"/)
  assert.doesNotMatch(playerCsv(selected), /Staff only|Bot player/)
})
