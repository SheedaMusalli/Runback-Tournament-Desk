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
    dark: true,
    themes: {
      light: {
        primary: "#d93254",
        accent: "#43d9ee",
      },
      dark: {
        primary: "#d93254",
        accent: "#43d9ee",
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

