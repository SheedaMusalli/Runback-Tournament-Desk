<template>
  <section class="tree-workspace" aria-label="Tournament bracket">
    <header class="tree-toolbar"><div><b>Bracket map</b><span>Click a set to manage players, sides and scores.</span></div><div class="tree-zoom"><button @click="zoom=Math.max(.25,zoom-.1)" aria-label="Zoom out">−</button><output>{{ Math.round(zoom*100) }}%</output><button @click="zoom=Math.min(1.5,zoom+.1)" aria-label="Zoom in">+</button><button @click="fit">Fit all</button><button @click="zoom=1">Reset</button></div></header>
    <div class="tree-viewport">
      <div :style="{width:layout.width*zoom+'px',height:layout.height*zoom+'px'}">
        <div class="tree-canvas" :style="{width:layout.width+'px',height:layout.height+'px',transform:'scale('+zoom+')'}">
          <section v-for="band in layout.bands" :key="band.name" class="tree-band" :style="{top:band.top+'px',width:layout.width+'px',height:band.height+'px'}">
            <div class="tree-band-label">{{ band.name }}<span>{{ band.count }} sets</span></div>
            <header v-for="round in band.rounds" :key="round.key" class="tree-round" :style="{left:round.x+'px'}"><b>{{ round.label }}</b><span>Best of {{ round.ft*2-1 }}</span></header>
          </section>
          <svg class="tree-lines" :width="layout.width" :height="layout.height" aria-hidden="true"><path v-for="(edge,i) in layout.edges" :key="i" :d="edge" /></svg>
          <button v-for="node in layout.nodes" :key="node.match.id" class="tree-set" :class="[node.match.status,{stream:event.streamMatch===node.match.id}]" :style="{left:node.x+'px',top:node.y+'px'}" :disabled="!['ready','playing','done'].includes(node.match.status)" :aria-label="node.match.id+': '+player(node.match,0)+' versus '+player(node.match,1)+'. '+node.match.status" @click="$emit('open',node.match)">
            <span class="tree-id">{{ node.match.id }}</span>
            <span v-for="side in [0,1]" :key="side" class="tree-player" :class="{won:node.match.winner && node.match.winner===node.match.players[side],pending:!node.match.players[side]}"><span class="tree-seed">{{ seed(node.match.players[side]) }}</span><span class="tree-name" :title="player(node.match,side)">{{ player(node.match,side) }}</span><strong>{{ ['waiting','skipped','bye'].includes(node.match.status)?'–':node.match.scores[side] }}</strong></span>
            <span v-if="node.match.status==='playing'" class="tree-live">● {{ node.match.station || 'Playing' }}</span>
          </button>
        </div>
      </div>
    </div>
    <footer class="tree-legend"><span><i class="legend-win"></i>Set winner</span><span><i class="legend-live"></i>In progress</span><span>Top row = P1 · bottom row = P2</span><span>Switch sides inside a set</span></footer>
  </section>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Event as TournamentEvent, Match } from 'src/extension/organizer/engine'
import { bracketLayout } from './bracket-layout'
import './bracket-tree.css'
@Component
export default class BracketTree extends Vue {
  @Prop({required:true}) event!:TournamentEvent
  @Prop({default:''}) section!:string
  zoom=1
  get layout(){return bracketLayout(this.event.matches.filter(m=>!this.section||m.section===this.section))}
  fit():void {const viewport=this.$el.querySelector('.tree-viewport') as HTMLElement;if(viewport)this.zoom=Math.max(.25,Math.min(1,(viewport.clientWidth-24)/this.layout.width,(window.innerHeight*.78-20)/this.layout.height))}
  seed(id:string):string { const index=this.event.entrants.findIndex(p=>p.id===id);return index<0?'':String(index+1) }
  player(match:Match,side:number):string {
    const entrant=this.event.entrants.find(p=>p.id===match.players[side]);if(entrant)return entrant.name
    const source=match.sources[side];if(!source)return 'TBD'
    if(source.kind==='player')return source.id?'TBD':'Bye'
    if(source.kind==='pool')return `Pool ${source.id} · #${source.place||1}`
    return `${source.kind==='winner'?'Winner':'Loser'} of ${source.id}`
  }
}
</script>
