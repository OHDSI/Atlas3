// histoire.config.ts
import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './histoire.setup.ts',
  theme: {
    title: 'Atlas UI',
    logo: {
      square: '/src/assets/icons/atlas-ui-library-logo.svg',
      light: '/src/assets/icons/atlas-ui-library-logo.svg',
      dark: '/src/assets/icons/atlas-ui-library-logo-dark.svg',
    },
    logoHref: 'https://github.com/OHDSI/Atlas3',
    colors: {
      primary: {
        50: '#eaf1f6',
        100: '#cdddea',
        200: '#a9c4d8',
        300: '#84abc6',
        400: '#6aa3cb',
        500: '#1f425a',
        600: '#1b3a50',
        700: '#163349',
        800: '#112839',
        900: '#0c1d2a',
      },
    },
  },
  storyMatch: ['src/components/ui/**/*.story.vue'],
  vite: {
    base: '/Atlas3/',
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  tree: {
    groups: [
      { id: 'top', title: '' },
      { id: 'components', title: 'Components' },
    ],
  },
})
