<template>
  <div id="tekken-scoreboard">
    <div v-for="i in [0, 1]" :key="i" class="fighter-plate" :class="'fighter-' + i">
      <img v-if="flag_path(i)" class="country-flag" :src="flag_path(i)" :alt="player(i).country" />
      <div class="fighter-name">
        <fitty :options="{ minSize: 10, maxSize: 30, multiLine: false }">
          <span class="team">{{ player(i).team }}</span>
          <span>{{ player(i).gamertag || ('PLAYER ' + (i + 1)) }}</span>
          <span class="latin">{{ latin(i) }}</span>
        </fitty>
      </div>
      <span v-if="show_sides" class="bracket-side">{{ rules.is_winner(i, side) ? 'W' : 'L' }}</span>
      <div class="set-score" :key="'score-' + i + '-' + scoreboard.scores[i].score">{{ scoreboard.scores[i].score }}</div>
    </div>
    <div v-if="progress.trim()" class="stage-tag" :style="{ top: stage_y + 'px' }">
      <span class="stage-label">TOURNAMENT STAGE</span>
      <div class="stage-name"><fitty :options="{ minSize: 10, maxSize: 23, multiLine: false }">{{ progress }}</fitty></div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator"
import { State } from "vuex-class"
import { BracketReplicant, Player, PlayersReplicant, ScoreboardReplicant, Rules, Stage, Side } from "src/dashboard/runback/_types"

@Component
export default class App extends Vue {
  @State((state) => state.Runback.players) players!: PlayersReplicant
  @State((state) => state.Runback.scoreboard) scoreboard!: ScoreboardReplicant
  @State((state) => state.Runback.bracket) bracket!: BracketReplicant
  readonly rules = new Rules()
  // Optional OBS URL adjustment, in pixels on the 1920 x 1080 canvas.
  get stage_y(): number {
    const value = Number(new URLSearchParams(window.location.search).get("stageY") || 158)
    return Number.isFinite(value) ? Math.max(150, Math.min(950, value)) : 158
  }
  player(i: number): Player {
    const override = this.scoreboard.overrides[i]
    return Object.assign(new Player(), override.should_override ? override.override : this.players[this.scoreboard.scores[i].player_id])
  }
  latin(i: number): string {
    const p = this.player(i)
    const text = p.gamertag_latin || p.gamertag_latin_generated
    return text ? `(${text})` : ""
  }
  flag_path(i: number): string {
    const country = this.player(i).country.toUpperCase()
    if (!/^[A-Z]{2}$/.test(country)) return ""
    try { return require(`./img/region-flags/svg/${country}.svg`) } catch (_) { return "" }
  }
  get side(): Side { return Side.from_value(this.bracket.side) }
  get show_sides(): boolean {
    return this.bracket.stage === Stage.GrandFinal.value && this.bracket.side >= Side.WinnersLosers.value && this.bracket.side <= Side.LosersLosers.value
  }
  get progress(): string {
    if (this.bracket.custom_progress_enabled) return this.bracket.custom_progress
    const stage = Stage.from_value(this.bracket.stage)
    const side = this.side
    const parts: string[] = []
    if (stage.value !== Stage.GrandFinal.value && side.value >= Side.Winners.value && side.value <= Side.Losers.value) parts.push(side.text)
    if (stage.value >= Stage.Pools.value && stage.value <= Stage.GrandFinal.value) parts.push(stage.text)
    return parts.join(" ")
  }
}
</script>

<style>
/* Tekken 8, 1920 x 1080. All plate pixels end at y=46. The entire
   y=46..150 band stays transparent, including round indicators and timer. */
html, body { margin: 0; background: transparent; overflow: hidden; }
#tekken-scoreboard { position: fixed; inset: 0; width: 1920px; height: 1080px; color: #f5f7fb; pointer-events: none; font-family: "Bebas Neue Bold", "Rounded Mplus Bold", sans-serif; }
.fighter-plate { position: absolute; top: 4px; width: 550px; height: 42px; box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 0 0 0 12px; background: linear-gradient(100deg, #181c28f5, #090c14f2); border-top: 2px solid var(--accent); overflow: hidden; }
.fighter-0 { left: 238px; --accent: #ff4164; border-radius: 3px 3px 10px 3px; }
.fighter-1 { right: 238px; --accent: #43d9ee; flex-direction: row-reverse; padding: 0 12px 0 0; border-radius: 3px 3px 3px 10px; }
.country-flag { width: 38px; height: 25px; object-fit: contain; flex: 0 0 38px; }
.fighter-name { flex: 1; min-width: 0; overflow: hidden; line-height: 38px; }
.fighter-1 .fighter-name { text-align: right; }
.team { color: var(--accent); margin-right: 6px; }
.latin { color: #b8bfce; }
.bracket-side { font-size: 18px; color: var(--accent); }
.set-score { width: 54px; height: 40px; flex: 0 0 54px; background: var(--accent); color: #090d16; font-family: "Gilroy", sans-serif; font-size: 34px; line-height: 40px; text-align: center; animation: score-arrive .18s ease-out; }
.stage-tag { position: absolute; left: 825px; width: 270px; height: 48px; box-sizing: border-box; text-align: center; background: #101522ef; border-top: 2px solid #d6dbe5; border-radius: 2px 2px 9px 9px; padding: 4px 12px; overflow: hidden; }
.stage-label { display: block; font: 9px/12px Arial, sans-serif; letter-spacing: 2px; color: #a9b4c9; }
.stage-name { width: 100%; line-height: 24px; text-transform: uppercase; }
@keyframes score-arrive { from { opacity: .45; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .set-score { animation: none; } }
</style>
