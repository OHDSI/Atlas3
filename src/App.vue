<template>
  <v-app>
    <NavBar />

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import NavBar from '@/components/shared/NavBar.vue'
</script>

<style scoped>
/* Global styles will be added in assets/styles/ during implementation */
</style>
