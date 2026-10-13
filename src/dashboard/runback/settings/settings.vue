<template>
  <div class="legacy-page settings-page">
    <header class="legacy-heading"><div><span class="legacy-kicker">RUNBACK / PREFERENCES</span><h1>App settings<span>.</span></h1><p>Set up the broadcast desk once. Your existing tournament workflow stays the same.</p></div></header>
    <div class="settings-grid">
      <v-card class="settings-card">
        <div class="settings-card-heading"><span class="settings-icon mdi mdi-monitor-dashboard"></span><div><h2>Display & broadcast</h2><p>Choose how Runback looks and how the overlay reads on stream.</p></div></div>
        <v-select v-model="appearance" :items="apperance_list" item-text="text" label="Appearance" return-object outlined dense hide-details class="settings-control" />
        <div class="settings-option"><div><b>Flip commentator sides</b><small>Use this when your camera or video feed is mirrored.</small></div><v-switch v-model="flip_commentator_sides" color="primary" hide-details class="ma-0 pa-0" /></div>
        <div class="settings-option"><div><b>Latinize player names</b><small>Show a Latin version when a gamertag uses another script.</small></div><v-switch v-model="auto_transliteration" color="primary" hide-details class="ma-0 pa-0" /></div>
        <div class="settings-option"><div><b>Live dashboard updates</b><small>Apply compatible Runback dashboard updates without a manual refresh.</small></div><v-switch v-model="live_dashboard_update" color="primary" hide-details class="ma-0 pa-0" /></div>
      </v-card>
      <v-card class="settings-card">
        <div class="settings-card-heading"><span class="settings-icon mdi mdi-link-variant"></span><div><h2>Event services</h2><p>Connect an external bracket service to fetch event entrants.</p></div></div>
        <div class="settings-info"><b>Start.gg API key</b><small>Stored in this Runback profile. Needed only when importing entrants from Start.gg.</small></div>
        <v-dialog v-model="dialog" max-width="500px">
          <template v-slot:activator="{ on, attrs }"><v-btn color="primary" class="settings-action" v-bind="attrs" v-on="on" @click="edit_form">Manage API key</v-btn></template>
          <v-card>
            <v-card-title><span class="headline">Start.gg API key</span></v-card-title>
            <v-card-text><v-form ref="form" v-model="form_valid"><v-text-field v-model="edited.api_keys.smash" :append-icon="show_smash_gg_api_key ? 'mdi-eye' : 'mdi-eye-off'" :type="show_smash_gg_api_key ? 'text' : 'password'" :rules="[smash_gg_api_key_rules.min]" label="API key" counter outlined @click:append="show_smash_gg_api_key = !show_smash_gg_api_key" /></v-form></v-card-text>
            <v-card-actions><v-spacer></v-spacer><v-btn text @click="close">Cancel</v-btn><v-btn color="primary" text :disabled="!form_valid" @click="save">Save key</v-btn></v-card-actions>
          </v-card>
        </v-dialog>
      </v-card>
      <v-card class="settings-card">
        <div class="settings-card-heading"><span class="settings-icon mdi mdi-earth"></span><div><h2>Regional defaults</h2><p>Used to prefill country when you add a player.</p></div></div>
        <v-autocomplete label="Default player country" v-model="default_country" :items="countries" item-text="name" item-value="code" outlined dense hide-details class="settings-control" />
      </v-card>
      <div class="settings-credit"><b>Runback Tournament Desk</b><span>Tekken 8 build by Sheeda Talli · Original Runback created by Opeik</span></div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  Vue,
  Component,
  Watch,
  PropSync,
  Prop,
  Ref,
} from "vue-property-decorator"
import { State, Mutation } from "vuex-class"
import { State2Way } from "vuex-class-state2way"
import {
  SettingsReplicant,
  Api,
  ApiProvider,
  Appearance,
} from "src/dashboard/runback/_types/"
import type { ActionMethod } from "vuex"
import countryList from "country-list"

@Component
export default class extends Vue {
  @Ref("form") readonly form!: any
  @State((state) => state.Runback.settings) settings!: SettingsReplicant
  @Mutation("set_dark_mode") set_dark_mode!: ActionMethod
  @Mutation("set_flip_commentator_sides")
  set_flip_commentator_sides!: ActionMethod
  @Mutation("set_default_country") set_default_country!: ActionMethod
  @Mutation("set_appearance") set_appearance!: ActionMethod
  @Mutation("set_live_dashboard_update")
  set_live_dashboard_update!: ActionMethod
  @Mutation("set_api_key") set_api_key!: ActionMethod
  @Mutation("set_auto_transliteration") set_transliteration!: ActionMethod

  show_smash_gg_api_key: boolean = false

  dialog = false
  form_valid = false
  edited = {
    api_keys: {
      smash: "",
    },
  }

  readonly countries = countryList.getData()
  readonly smash_gg_api_key_rules: any = {
    min: (v: string) => v.length === 32 || "Must be 32 characters",
  }
  readonly apperance_list = Object.values(Appearance)

  close(): void {
    this.reset_validation()
    this.dialog = false
    this.$nextTick(() => {
      this.edited.api_keys.smash = ""
    })
  }

  save(): void {
    this.smash_gg_api_key = this.edited.api_keys.smash
    this.close()
  }

  edit_form(): void {
    this.edited.api_keys.smash = this.smash_gg_api_key
    this.dialog = true
  }

  reset_validation(): void {
    this.form.resetValidation()
  }

  get dark_mode(): boolean {
    return this.settings.dark_mode
  }

  set dark_mode(v: boolean) {
    this.set_dark_mode(v)
  }

  get auto_transliteration(): boolean {
    return this.settings.auto_transliteration
  }

  set auto_transliteration(v: boolean) {
    this.set_transliteration(v)
  }

  get flip_commentator_sides(): boolean {
    return this.settings.flip_commentator_sides
  }

  set flip_commentator_sides(v: boolean) {
    this.set_flip_commentator_sides(v)
  }

  get default_country(): string {
    return this.settings.default_country
  }

  set default_country(v: string) {
    this.set_default_country(v)
  }

  get appearance(): Appearance {
    return this.settings.appearance
  }

  set appearance(v: Appearance) {
    this.set_appearance(v)
  }

  get live_dashboard_update(): boolean {
    return this.settings.live_dashboard_update
  }

  set live_dashboard_update(v: boolean) {
    this.set_live_dashboard_update(v)
  }

  get smash_gg_api_key(): string {
    return this.settings.api_keys[ApiProvider.Smash.text] || ""
  }

  set smash_gg_api_key(v: string) {
    this.set_api_key({ api: ApiProvider.Smash, api_key: v })
  }
}
</script>

<style scoped>
.legacy-page { width:100%; max-width:1280px; margin:0 auto; padding:28px 24px 50px; color:#f1f4f9; }
.legacy-heading { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:26px; }
.legacy-kicker { color:#d6f58b; font-size:10px; font-weight:700; letter-spacing:2px; }
.legacy-heading h1 { margin:8px 0 4px; color:#f6f8fb; font-size:34px; font-weight:750; letter-spacing:-1px; }
.legacy-heading h1 span { color:#d6f58b; }
.legacy-heading p { margin:0; color:#9aa7ba; font-size:13px; }
.settings-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
.settings-card { padding:22px 24px; border:1px solid #30394a!important; border-radius:12px!important; background:linear-gradient(145deg,#191f2b,#141a24)!important; color:#f1f4f9!important; }
.settings-card-heading { display:flex; gap:14px; align-items:center; margin-bottom:20px; }
.settings-icon { width:40px; height:40px; border-radius:10px; display:grid; place-items:center; color:#d6f58b; background:#d6f58b12; font-size:21px; }
.settings-card-heading h2 { margin:0; font-size:16px; color:#f1f4f9; }
.settings-card-heading p { margin:3px 0 0; color:#929fb2; font-size:11px; }
.settings-control { max-width:420px; }
.settings-option { min-height:68px; display:flex; justify-content:space-between; align-items:center; gap:20px; border-top:1px solid #30394a; }
.settings-option b,.settings-info b { display:block; color:#e5eaf2; font-size:12px; }
.settings-option small,.settings-info small { display:block; margin-top:3px; color:#919eb1; font-size:10px; }
.settings-action { margin-top:18px; text-transform:none; letter-spacing:0; }
.settings-info { padding:14px 16px; border:1px solid #30394a; border-radius:8px; background:#111721; }
.settings-credit { grid-column:1/-1; display:flex; justify-content:space-between; gap:12px; padding:15px 3px; color:#a2aec0; font-size:11px; }
.settings-credit span { color:#7f8ca0; }
@media(max-width:760px) { .legacy-page { padding:18px 12px 35px; }.legacy-heading h1 { font-size:29px; }.settings-grid { grid-template-columns:1fr; }.settings-credit { flex-direction:column; } }
</style>
