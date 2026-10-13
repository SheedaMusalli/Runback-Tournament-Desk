<template>
<v-navigation-drawer app permanent width="240" class="workspace-navigation">
<router-link class="workspace-brand" to="/"><span class="brand-mark">R<span>↗</span></span><span>runback<small>TOURNAMENT DESK</small></span></router-link>
<span class="nav-label">YOUR WORKSPACE</span><nav class="workspace-links" aria-label="Workspace navigation"><router-link v-for="item in items" :key="item.title" :to="item.link" exact><i :class="'mdi '+item.icon" aria-hidden="true"></i>{{ item.title }}</router-link></nav>
<div class="workspace-credit"><b>Build by Sheeda Talli</b><br>Original Runback by Opeik<small class="build-stamp">DESIGN 03 · CONNECTED BRACKETS</small></div>
</v-navigation-drawer>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator"

@Component
export default class Navigation extends Vue {
  readonly twitter: string = "https://twitter.com/iamopeik"

  items = [
    { title: "Tournament desk", icon: "mdi-view-dashboard", link: "/" },
    { title: "Manual broadcast", icon: "mdi-monitor", link: "/manual" },
    { title: "Players", icon: "mdi-account-group", link: "/players" },
    { title: "OBS overlays", icon: "mdi-palette", link: "/graphics" },
    { title: "App settings", icon: "mdi-cog", link: "/settings" },
    { title: "About", icon: "mdi-information", link: "about" },
  ]

  get should_draw_mini(): boolean {
    return this.$vuetify.breakpoint.mdAndDown
  }

  get icon_size(): number {
    return this.$vuetify.breakpoint.mdAndDown ? 24 : 72
  }
}
</script>


