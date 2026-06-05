<!-- src/components/ui/_TierB.story.vue -->
<script setup lang="ts">
import AtlasTooltip from './AtlasTooltip.vue'
import AtlasTabs from './AtlasTabs.vue'
import AtlasTab from './AtlasTab.vue'
import AtlasList from './AtlasList.vue'
import AtlasListItem from './AtlasListItem.vue'
import AtlasDivider from './AtlasDivider.vue'
import AtlasProgressLinear from './AtlasProgressLinear.vue'
import AtlasProgressCircular from './AtlasProgressCircular.vue'
import AtlasSkeleton from './AtlasSkeleton.vue'
import AtlasPagination from './AtlasPagination.vue'
import AtlasAvatar from './AtlasAvatar.vue'
import AtlasBanner from './AtlasBanner.vue'
import AtlasSpacer from './AtlasSpacer.vue'
import AtlasRow from './AtlasRow.vue'
import AtlasCol from './AtlasCol.vue'
import AtlasContainer from './AtlasContainer.vue'
import AtlasButton from './AtlasButton.vue'

import { ref } from 'vue'
const tab = ref('a')
const page = ref(1)
</script>

<template>
  <Story
    title="Tier B Canonical"
    group="tier-b"
  >
    <Variant title="all wrappers (smoke check)">
      <AtlasContainer>
        <AtlasRow>
          <AtlasCol>
            <h3>Tooltip / Menu / Tabs / List</h3>
            <AtlasTooltip text="A tooltip">
              <template #activator="{ props }">
                <AtlasButton v-bind="props">
                  Hover me
                </AtlasButton>
              </template>
            </AtlasTooltip>

            <AtlasTabs
              v-model="tab"
              style="margin-top: 16px;"
            >
              <AtlasTab value="a">
                First
              </AtlasTab>
              <AtlasTab value="b">
                Second
              </AtlasTab>
            </AtlasTabs>

            <AtlasList style="margin-top: 16px;">
              <AtlasListItem>One</AtlasListItem>
              <AtlasListItem>Two</AtlasListItem>
            </AtlasList>

            <AtlasDivider style="margin: 16px 0;" />

            <AtlasProgressLinear :model-value="40" />
            <div style="margin-top: 12px;">
              <AtlasProgressCircular
                :model-value="60"
                :size="32"
              />
            </div>

            <AtlasSkeleton
              type="text"
              style="margin-top: 12px;"
            />

            <AtlasPagination
              v-model="page"
              :length="5"
              style="margin-top: 12px;"
            />
          </AtlasCol>
          <AtlasCol>
            <h3>Avatar / Banner / Icon</h3>
            <AtlasAvatar
              color="primary"
              size="40"
            >
              AB
            </AtlasAvatar>

            <AtlasBanner
              style="margin-top: 16px;"
              text="A banner message"
            />

            <div style="display: flex; margin-top: 16px;">
              <span>Left</span>
              <AtlasSpacer />
              <span>Right</span>
            </div>
          </AtlasCol>
        </AtlasRow>
      </AtlasContainer>
    </Variant>
  </Story>
</template>
