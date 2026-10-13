<template>
  <v-container fluid class="broadcast-desk">
    <header class="desk-heading">
      <div><div class="eyebrow">TEKKEN 8 / BROADCAST CONTROL</div><h1>Match desk<span>.</span></h1><p>Set the players. Track the set. Keep the fight in focus.</p></div>
      <v-btn color="primary" to="/graphics"><v-icon left>mdi-monitor</v-icon>OBS overlays</v-btn>
    </header>
    <div class="hud-note"><span class="hud-dot"></span>HUD-safe layout <span class="note-detail">Names above the health bars. Tournament stage below the timer. Round wins stay in-game.</span></div>
    <v-row>
      <v-col cols="12" lg="8" class="d-flex flex-column match-panel"><scoreboard-panel /></v-col>
      <v-col cols="12" lg="4" class="d-flex flex-column"><bracket-panel /></v-col>
      <v-col cols="12" md="6" class="d-flex flex-column"><commentary-panel /></v-col>
      <v-col cols="12" md="6" class="d-flex flex-column"><event-panel /></v-col>
    </v-row>
  </v-container>
</template>
<script lang="ts">
import { Vue, Component } from "vue-property-decorator"
@Component
export default class extends Vue {}
</script>
