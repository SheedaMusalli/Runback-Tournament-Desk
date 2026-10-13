<template>
  <section class="event-history">
    <template v-if="mode==='history'">
      <div class="page-title history-title">
        <div><span class="eyebrow">YOUR EVENTS · SAVED ON THIS COMPUTER</span><h1>Tournament history<span>.</span></h1><p>Every tournament you host stays here, with its bracket, players and results.</p></div>
        <button class="btn primary" @click="$emit('create')">+ New tournament</button>
      </div>
      <div class="history-summary">
        <article><b>{{ events.length }}</b><span>ALL TOURNAMENTS</span></article>
        <article><b>{{ completedCount }}</b><span>COMPLETED</span></article>
        <article><b>{{ activeCount }}</b><span>IN PROGRESS</span></article>
        <article><b>{{ endedCount }}</b><span>ENDED / TESTS</span></article>
      </div>
      <div class="history-tools">
        <label class="history-search"><span>Find a tournament</span><input v-model="query" placeholder="Type a name, venue or champion…" aria-label="Search tournament history" /></label>
        <label><span>Show</span><select v-model="filter" aria-label="Filter tournament history"><option value="all">All tournaments</option><option value="completed">Completed</option><option value="active">In progress</option><option value="ended">Ended / tests</option><option value="draft">Not started</option></select></label>
      </div>
      <div v-if="filtered.length" class="history-list">
        <article v-for="event in filtered" :key="event.id" class="history-card">
          <div class="history-card-main">
            <div class="history-card-heading"><h2>{{ event.name }}</h2><span class="history-status" :class="status(event)">{{ statusText(event) }}</span></div>
            <p class="history-meta"><span>{{ event.date || eventDate(event) }}</span><span v-if="event.venue">{{ event.venue }}</span><span>{{ event.entrants.length }} players</span><span>{{ format(event.format) }}</span></p>
            <p v-if="event.champion" class="history-champion">🏆 Champion: <b>{{ playerName(event,event.champion) }}</b></p>
            <p v-else-if="event.ended" class="history-champion">Tournament ended early · saved results are still available.</p>
            <p v-else-if="!event.started" class="history-champion">Registration draft · add players when you are ready.</p>
          </div>
          <div class="history-actions">
            <button class="btn primary small" @click="$emit('open',event.id,'overview')">Open tournament</button>
            <button v-if="event.champion || event.matches.length" class="btn small" @click="$emit('open',event.id,'results')">View results</button>
            <button class="btn small" @click="$emit('export',event.id)">Download backup</button>
          </div>
        </article>
      </div>
      <div v-else class="org-card history-empty">
        <div class="history-empty-icon">▤</div>
        <h2>{{ events.length ? 'No tournaments found' : 'Your tournament history starts here' }}</h2>
        <p>{{ events.length ? 'Try a different name or choose “All tournaments”.' : 'When you create an event, Runback saves its players, bracket and match results here. You can come back to old tournaments any time.' }}</p>
        <button v-if="!events.length" class="btn primary" @click="$emit('create')">Create your first tournament</button>
      </div>
      <details class="history-research"><summary>Browse Tekken 8 event examples</summary>
        <p class="reference-note">A selected research library for format ideas. It is separate from your own hosted-tournament history.</p>
        <div class="table-toolbar"><input class="search" v-model="query" aria-label="Search event examples" placeholder="Search events, regions, ideas…"/><select v-model="year" aria-label="Filter event year"><option value="">All years</option><option>2026</option><option>2025</option><option>2024</option></select><label class="ops-check"><input type="checkbox" v-model="practical"/>With a specific lesson</label><span>{{ references.length }} examples</span></div>
        <div class="atlas-grid"><article v-for="r in references" :key="r.name+r.year" class="atlas-card"><header><span>{{ r.region }}</span><b>{{ r.year }}</b></header><h2>{{ r.name }}</h2><span class="atlas-type">{{ r.type }}</span><p>{{ r.evidence }}</p><div class="atlas-lesson"><small>LESSON / {{ r.feature }}</small><p>{{ r.lesson }}</p></div><a :href="r.source" target="_blank" rel="noopener noreferrer">Read the source ↗</a></article></div>
        <p v-if="!references.length" class="small-empty">No examples match that search.</p>
        <div class="button-row"><a href="https://tekkenworldtour.com/" target="_blank" rel="noopener noreferrer">Official World Tour ↗</a><a href="https://www.start.gg/search/tournaments?refinementList%5Bevents.videogame.id%5D=49783" target="_blank" rel="noopener noreferrer">Tekken 8 event directory ↗</a></div>
      </details>
      <p class="history-retention">Your records remain in this Runback workspace until you choose <b>Delete event</b>. Download a backup to keep a separate copy.</p>
    </template>
  </section>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Event as TournamentEvent } from 'src/extension/organizer/engine'
import { EVENT_LIBRARY } from './event-library'

@Component
export default class EventLibrary extends Vue {
  @Prop({ default: () => [] }) readonly events!: TournamentEvent[]
  mode='history'; query=''; filter='all'; year=''; practical=false
  get sorted():TournamentEvent[]{return [...this.events].sort((a,b)=>this.timestamp(b)-this.timestamp(a))}
  get filtered():TournamentEvent[]{const q=this.query.trim().toLowerCase();return this.sorted.filter(e=>{
    const status=this.status(e)
    const visible=this.filter==='all'||this.filter===status
    const text=[e.name,e.venue,e.champion?this.playerName(e,e.champion):'',...e.entrants.map(p=>p.name)].join(' ').toLowerCase()
    return visible&&(!q||text.includes(q))
  })}
  get completedCount():number{return this.events.filter(e=>!!e.champion).length}
  get activeCount():number{return this.events.filter(e=>e.started&&!e.ended&&!e.champion).length}
  get endedCount():number{return this.events.filter(e=>e.ended&&!e.champion).length}
  get references(){return EVENT_LIBRARY.filter(r=>(!this.year||r.year===Number(this.year))&&(!this.practical||r.feature!=='Reference only')&&(r.name+' '+r.region+' '+r.type+' '+r.feature).toLowerCase().includes(this.query.toLowerCase()))}
  status(e:TournamentEvent):string{return e.champion?'completed':e.ended?'ended':e.started?'active':'draft'}
  statusText(e:TournamentEvent):string{return ({completed:'Completed',ended:'Ended',active:'In progress',draft:'Not started'} as Record<string,string>)[this.status(e)]}
  format(value:string):string{return ({double:'Double elimination',single:'Single elimination',groups:'Groups + playoffs',pools:'Pools + finals'} as Record<string,string>)[value]||value}
  playerName(e:TournamentEvent,id:string):string{return e.entrants.find(p=>p.id===id)?.name||'Unknown player'}
  timestamp(e:TournamentEvent):number{const value=e.date||e.endedAt||e.history?.[0]?.at;const parsed=value?Date.parse(value):NaN;return Number.isFinite(parsed)?parsed:0}
  eventDate(e:TournamentEvent):string{const value=e.endedAt||e.history?.[0]?.at;if(!value)return 'Date not set';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'Date not set':parsed.toLocaleDateString()}
}
</script>
