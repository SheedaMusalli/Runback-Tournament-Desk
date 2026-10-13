<template>
  <main class="loader-screen">
    <section class="loader-card" aria-live="polite" aria-label="Runback is starting">
      <div class="loader-brand"><span class="loader-mark">R<span>↗</span></span><div><b>RUNBACK</b><small>TEKKEN 8 TOURNAMENT DESK</small></div></div>
      <div class="loader-art" aria-hidden="true"><i></i><i></i><i></i><span>ROUND<br/>{{ round }}</span></div>
      <p class="loader-status">{{ load_quote }}</p>
      <div class="loader-progress"><i></i></div>
      <small class="loader-credit">Tournament build by Sheeda Talli <span>·</span> Original Runback by Opeik</small>
    </section>
  </main>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator"

@Component
export default class extends Vue {
  readonly load_quotes = [
    "Setting the stage for the next set",
    "Checking the bracket and stations",
    "Calling the next match",
    "Getting the tournament floor ready",
    "Loading player cards and match data",
  ]
  readonly round = Math.floor(Math.random() * 8) + 1
  readonly load_quote = this.load_quotes[Math.floor(Math.random() * this.load_quotes.length)]
}
</script>
