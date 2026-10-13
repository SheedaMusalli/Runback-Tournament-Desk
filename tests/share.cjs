const assert = require('assert/strict')
const express = require('express')
const http = require('http')
const { setupOrganizer } = require('../extension/organizer/server.js')
const engine = require('../extension/organizer/engine.js')

async function main() {
  const app = express()
  const replicants = {}
  const nodecg = {
    bundleConfig: {},
    Replicant(name, options = {}) {
      if (!replicants[name]) replicants[name] = { value: options.defaultValue }
      return replicants[name]
    },
    Router: () => express.Router(),
    mount: (path, router) => app.use(path, router),
    listenFor: () => {},
    log: { info() {}, warn() {}, error() {} },
  }
  nodecg.Replicant('Players').value = {}
  setupOrganizer(nodecg)
  let state = engine.emptyOrganizer()
  state = engine.reduce(state, { revision: state.revision, action: 'create', data: { name: 'Share route test', preset: 'tekken-pools' } }, 'share-event', '2026-10-13T00:00:00.000Z')
  state = engine.reduce(state, { revision: state.revision, action: 'addPlayers', eventId: 'share-event', data: { players: ['A', 'B', 'C', 'D'].map((name) => ({ name })) } }, 'share-players', '2026-10-13T00:00:01.000Z')
  state = engine.reduce(state, { revision: state.revision, action: 'checkAll', eventId: 'share-event' }, 'share-checkin', '2026-10-13T00:00:02.000Z')
  state = engine.reduce(state, { revision: state.revision, action: 'start', eventId: 'share-event' }, 'share-start', '2026-10-13T00:00:03.000Z')
  replicants.Organizer.value = state
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  try {
    const ok = await fetch(`http://127.0.0.1:${port}/runback-share/api/v1/events/share-event`)
    assert.equal(ok.status, 200)
    const payload = await ok.json()
    assert.equal(payload.name, 'Share route test')
    assert(payload.matches.length > 0)
    assert(payload.matches.some((match) => match.sources.some((source) => source.kind === 'pool')))
    assert(payload.matches.every((match) => Array.isArray(match.players)))
    // The legacy runtime's array wrapper serializes as an array but has no find().
    replicants.Organizer.value = { ...state, events: { toJSON: () => state.events } }
    const observable = await fetch(`http://127.0.0.1:${port}/runback-share/api/v1/events/share-event`)
    assert.equal(observable.status, 200, 'Replicant array wrappers must be serialized before traversal')
    assert.deepEqual(await observable.json(), payload)
    const missing = await fetch(`http://127.0.0.1:${port}/runback-share/api/v1/events/missing-event`)
    assert.equal(missing.status, 404)
    console.log('Public bracket API tests passed: event payload, pool progression sources, and missing-event response.')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
