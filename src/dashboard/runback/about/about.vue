<template>
  <div class="legacy-page about-page">
    <header class="legacy-heading"><div><span class="legacy-kicker">ABOUT THIS BUILD</span><h1>Runback<span>.</span></h1><p>A focused tournament desk for Tekken 8 organizers and stream crews.</p></div></header>
    <v-card class="about-card">
      <div class="about-brand"><div class="about-logo"><v-icon size="58">$logo</v-icon></div><div><span class="legacy-kicker">TEKKEN 8 TOURNAMENT DESK</span><h2>Runback <small>v{{ version }}</small></h2><p>Manage entrants, matches, stations and broadcast output in one place.</p></div></div>
      <div class="credit-grid"><section><span>TOURNAMENT DESK BUILD</span><b>Sheeda Talli</b><small>Visual overhaul and Tekken 8 tournament workflow.</small></section><section><span>ORIGINAL RUNBACK</span><b><a :href="twitter" target="_blank" rel="noopener noreferrer">Opeik ↗</a></b><small>Original Runback application and broadcast graphics.</small></section></div>
      <div class="update-row"><div class="update-indicator"><v-progress-circular v-if="checking_for_updates" indeterminate color="primary" size="22"></v-progress-circular><v-icon v-else>{{ icon_name }}</v-icon></div><div><b>{{ message }}</b><small v-if="is_out_of_date && !checking_for_updates"><a :href="new_version_url" target="_blank" rel="noopener noreferrer">Version {{ new_version }} is available ↗</a></small><small v-else>Update status is checked when Runback opens.</small></div></div>
    </v-card>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator"
import { Updater, SettingsReplicant } from "src/dashboard/runback/_types/"
import type { ActionMethod } from "vuex"
import { State } from "vuex-class"

@Component
export default class extends Vue {
  @State((state) => state.Runback.settings.version) version!: string
  readonly github: string = "https://github.com/opeik/runback"
  readonly twitter: string = "https://twitter.com/iamopeik"

  checking_for_updates: boolean = false
  is_out_of_date: boolean = false
  new_version: string = ""

  get message(): string {
    if (this.checking_for_updates) {
      return "Checking for updates"
    } else if (this.is_out_of_date) {
      return "Out of date"
    } else {
      return "Up to date!"
    }
  }

  get new_version_url(): string {
    return "https://github.com/opeik/runback/releases/tag/" + this.new_version
  }

  get icon_name(): string {
    if (this.is_out_of_date) {
      return "mdi-alert-circle"
    } else {
      return "mdi-check"
    }
  }

  async mounted(): Promise<void> {
    await this.check_updates()
  }

  async check_updates(): Promise<void> {
    this.checking_for_updates = true

    let r = await Updater.check_up_to_date(this.version)
    if (r.found_new_version) {
      this.is_out_of_date = true
      this.new_version = r.version!
    }
    this.checking_for_updates = false
  }
}
</script>

<style scoped>
.legacy-page { width:100%; max-width:1280px; margin:0 auto; padding:28px 24px 50px; color:#f1f4f9; }
.legacy-heading { margin-bottom:26px; }
.legacy-kicker { color:#d6f58b; font-size:10px; font-weight:700; letter-spacing:2px; }
.legacy-heading h1 { margin:8px 0 4px; color:#f6f8fb; font-size:34px; font-weight:750; letter-spacing:-1px; }
.legacy-heading h1 span { color:#d6f58b; }
.legacy-heading p { margin:0; color:#9aa7ba; font-size:13px; }
.about-card { max-width:880px; padding:28px; border:1px solid #30394a!important; border-radius:13px!important; background:linear-gradient(145deg,#191f2b,#141a24)!important; color:#f1f4f9!important; }
.about-brand { display:flex; align-items:center; gap:20px; padding-bottom:25px; border-bottom:1px solid #30394a; }
.about-logo { width:82px; height:82px; display:grid; place-items:center; border:1px solid #485368; border-radius:18px; background:#101620; }
.about-brand h2 { margin:5px 0; font-size:25px; }.about-brand h2 small { color:#8592a5; font-size:12px; font-weight:400; }.about-brand p { margin:0; color:#99a6b8; font-size:12px; }
.credit-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:24px 0; }
.credit-grid section { padding:16px; border:1px solid #30394a; border-radius:9px; background:#111721; }.credit-grid section>span { display:block; color:#8e9bb0; font-size:9px; font-weight:700; letter-spacing:1.3px; }.credit-grid b { display:block; margin:7px 0 3px; font-size:15px; }.credit-grid a,.update-row a { color:#d6f58b; text-decoration:none; }.credit-grid small,.update-row small { display:block; color:#909db0; font-size:10px; }
.update-row { display:flex; align-items:center; gap:13px; padding:16px 0 0; border-top:1px solid #30394a; }.update-indicator { width:34px; height:34px; display:grid; place-items:center; color:#d6f58b; }.update-row b { font-size:12px; }
@media(max-width:680px) { .legacy-page { padding:18px 12px 35px; }.legacy-heading h1 { font-size:29px; }.about-card { padding:18px; }.credit-grid { grid-template-columns:1fr; }.about-logo { width:60px; height:60px; flex:0 0 60px; } }
</style>
