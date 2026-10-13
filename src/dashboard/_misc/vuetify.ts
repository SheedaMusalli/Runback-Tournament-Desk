import "@mdi/font/css/materialdesignicons.css"
import Vue from "vue"
import Vuetify from "vuetify/lib"
import "./common.css"
import "./fonts/roboto.css"
import colors from "vuetify/lib/util/colors"
import Logo from "src/dashboard/runback/components/logo.vue"

Vue.use(Vuetify)

export default new Vuetify({
  theme: {
    dark: false,
    themes: {
      light: {
        primary: "#7155dc",
        accent: "#369aa8",
      },
      dark: {
        primary: "#7155dc",
        accent: "#369aa8",
      },
    },
  },
  icons: {
    values: {
      logo: {
        component: Logo,
      },
    },
  },
})

