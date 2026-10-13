<template>
  <div class="player" :class="'player-' + player_num">
    <div class="player-label">PLAYER {{ player_num + 1 }} / {{ player_num === 0 ? 'LEFT SIDE' : 'RIGHT SIDE' }}</div>
    <v-autocomplete outlined hide-details label="Select player" v-model="player_id" item-text="gamertag" item-value="id" :items="players_array" />
    <div class="score-stepper">
      <v-btn icon outlined :disabled="Number(score) <= 0" :aria-label="'Decrease player ' + (player_num + 1) + ' set score'" @click="score = String(Number(score) - 1)"><v-icon>mdi-minus</v-icon></v-btn>
      <output class="score-value" aria-live="polite">{{ score }}</output>
      <v-btn icon color="primary" outlined :disabled="Number(score) >= 99" :aria-label="'Increase player ' + (player_num + 1) + ' set score'" @click="score = String(Number(score) + 1)"><v-icon>mdi-plus</v-icon></v-btn>
    </div>
    <div class="score-caption">GAMES WON IN THIS SET</div>
  </div>
</template>
<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator"
import { Mutation, State } from "vuex-class"
import {
  Player,
  PlayersReplicant,
  PlayerScore,
  ScoreboardReplicant,
} from "src/dashboard/runback/_types/"
import type { ActionMethod } from "vuex"

@Component
export default class ScoreboardEntry extends Vue {
  @Prop(Number) readonly player_num!: number
  @State((state) => state.Runback.players) players!: PlayersReplicant
  @State((state) => state.Runback.scoreboard) scoreboard!: ScoreboardReplicant
  @Mutation("set_scoreboard_score") set_scoreboard_score!: ActionMethod
  @Mutation("set_scoreboard_player_id") set_scoreboard_player_id!: ActionMethod

  get score(): string {
    return this.scoreboard.scores[this.player_num].score.toString()
  }

  set score(v: string) {
    this.set_scoreboard_score({
      player_num: this.player_num,
      score: Math.max(0, Math.min(99, parseInt(v, 10) || 0)),
    })
  }

  get player_id(): string {
    return this.scoreboard.scores[this.player_num].player_id
  }

  set player_id(v: string) {
    this.set_scoreboard_player_id({
      player_num: this.player_num,
      player_id: v,
    })
  }

  get players_array(): Player[] {
    return Object.values(this.players)
  }

  prevent_typing(evt: any) {
    evt.preventDefault()
  }
}
</script>

