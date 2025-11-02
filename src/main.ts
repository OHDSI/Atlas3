/**
 * Main Application Entry Point
 * Atlas Cohort Builder - Vue 3 + Vuetify
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import vuetify from './plugins/vuetify'
import App from './App.vue'

const app = createApp(App)

// Install Pinia (state management)
app.use(createPinia())

// Install Vue Router
app.use(router)

// Install Vuetify (UI framework)
app.use(vuetify)

app.mount('#app')
