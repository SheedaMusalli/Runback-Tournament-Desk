<template>
<section class="output-page"><header class="desk-heading"><div><span class="eyebrow">BROADCAST STUDIO</span><h1>Your stream, ready<span>.</span></h1><p>Choose an overlay. Add it to OBS once. Runback keeps it updated.</p></div></header>
<div class="output-grid"><article v-for="graphic in graphics" :key="graphic.name" class="output-card"><div class="output-preview"><span>{{ graphic.name==='Scoreboard'?'PLAYER ONE':'COMMENTATOR ONE' }}</span><em>{{ graphic.name==='Scoreboard'?'0 : 0':'ON AIR' }}</em><span>{{ graphic.name==='Scoreboard'?'PLAYER TWO':'COMMENTATOR TWO' }}</span></div><span class="eyebrow">1920 × 1080 · TRANSPARENT BACKGROUND</span><h2>{{ graphic.name }}</h2><p>{{ graphic.name==='Scoreboard'?'Player names, flags and set scores. Leaves Tekken 8 round indicators clear.':'Commentator names and social handles, controlled from the manual broadcast desk.' }}</p><div class="output-actions"><v-btn color="primary" @click="copy_url(format_url(graphic.name,graphic.file))">Copy source URL</v-btn><v-btn class="obs-drag-image" draggable :href="format_url(graphic.name,graphic.file)">Drag into OBS</v-btn></div></article></div>
<div class="output-steps"><span><b>01</b>Add a Browser Source in OBS.</span><span><b>02</b>Paste the URL. Set 1920 × 1080.</span><span><b>03</b>Keep Runback open while broadcasting.</span></div>
</section></template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator"

@Component
export default class extends Vue {
  readonly base_url: string = window.location.origin + "/bundles/runback/graphics/"
  readonly width = 1920
  readonly height = 1080
  readonly drag_offset = 30
  graphics = [
    { name: "Scoreboard", file: "scoreboard.html" },
    { name: "Commentary", file: "commentary.html" },
  ]
  drag_img = new Image()

  created(): void {
    this.drag_img.src = require("./img/obs-logo.svg")
  }

  mounted(): void {
    const buttons = document.getElementsByClassName("obs-drag-image")
    for (let i = 0; i < buttons.length; ++i) {
      const button: any = buttons[i]

      button.addEventListener("dragstart", (e: any) => {
        let event = e as DragEvent

        event.dataTransfer!.setDragImage(
          this.drag_img,
          this.drag_offset,
          this.drag_offset
        )
        event.dataTransfer!.setData("text/uri-list", button.href)
      })

      button.addEventListener("dragend", (e: any) => e.target.blur())
      button.addEventListener("click", (e: any) => e.preventDefault())
    }
  }

  copy_url(url: string) {
    navigator.clipboard.writeText(url)
  }

  format_url(name: string, file: string): string {
    return `${this.base_url}${file}?layer-name=${name}&layer-height=${this.height}&layer-width=${this.width}`
  }
}
</script>

