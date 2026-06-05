<script setup lang="ts">
import AtlasMenu from './AtlasMenu.vue'
import AtlasButton from './AtlasButton.vue'
import AtlasList from './AtlasList.vue'
import AtlasListItem from './AtlasListItem.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasMenu"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasMenu"
        description="Thin wrapper over Vuetify's VMenu. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VMenu props', type: 'see Vuetify VMenu', default: '—', description: 'All VMenu props are forwarded via attrs.' }]"
        :slots="[{ name: 'activator', description: 'Element that toggles the menu; receives { props } to bind.' }, { name: 'default', description: 'Menu content (typically a list).' }]"
        usage="<AtlasMenu><template #activator=&quot;{ props }&quot;><AtlasButton v-bind=&quot;props&quot;>Open</AtlasButton></template>...</AtlasMenu>"
      />
    </Variant>

    <Variant title="default">
      <AtlasMenu>
        <template #activator="{ props }">
          <AtlasButton v-bind="props">
            Open menu
          </AtlasButton>
        </template>
        <AtlasList>
          <AtlasListItem title="Profile" />
          <AtlasListItem title="Settings" />
          <AtlasListItem title="Sign out" />
        </AtlasList>
      </AtlasMenu>
    </Variant>
  </Story>
</template>
