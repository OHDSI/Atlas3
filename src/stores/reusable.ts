/**
 * Reusable Store
 * The reusable open in the editor: its metadata, its parsed design, whether it
 * has unsaved changes, and the version being previewed, if any.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Version } from '@/components/versions/types'
import type { Reusable, ReusableDesign, ReusableType } from '@/models/reusable.types'
import type { Tag } from '@/models/webapi.types'
import {
  assignReusableTag,
  copyReusable,
  createReusable,
  deleteReusable,
  getReusable,
  unassignReusableTag,
  updateReusable,
} from '@/services/reusable.service'
import { getReusableVersion } from '@/services/reusable-versions.service'
import {
  createEmptyDesign,
  parseReusableDesign,
  serializeReusableDesign,
} from '@/components/reusables/reusable-design'
import { syncAssetTags } from '@/utils/asset-tags'
import { logger } from '@/utils/logger'

const CONTEXT = 'ReusableStore'

export const useReusableStore = defineStore('reusable', () => {
  const current = ref<Reusable | null>(null)
  const design = ref<ReusableDesign>(createEmptyDesign())
  const previewVersion = ref<Version | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  // What was last loaded or saved, to tell whether anything changed since.
  const savedSnapshot = ref('')

  const isPreviewMode = computed(() => previewVersion.value !== null)

  function snapshot(): string {
    return JSON.stringify({
      name: current.value?.name ?? '',
      description: current.value?.description ?? '',
      design: design.value,
    })
  }

  const isDirty = computed(() => current.value !== null && snapshot() !== savedSnapshot.value)

  function setCurrent(reusable: Reusable) {
    current.value = reusable
    design.value = parseReusableDesign(reusable.data)
    savedSnapshot.value = snapshot()
  }

  function createNew(name: string, type: ReusableType = 'CRITERIA_GROUP') {
    current.value = { name, description: '' }
    design.value = createEmptyDesign(type)
    previewVersion.value = null
    error.value = null
    // A new reusable is unsaved by definition, so it starts dirty.
    savedSnapshot.value = ''
  }

  async function load(id: number): Promise<boolean> {
    loading.value = true
    error.value = null
    const result = await getReusable(id)
    loading.value = false
    if (!result.success) {
      error.value = result.error.message
      return false
    }
    setCurrent(result.data)
    previewVersion.value = null
    return true
  }

  function payload() {
    return {
      name: current.value?.name ?? '',
      description: current.value?.description ?? null,
      data: serializeReusableDesign(design.value),
    }
  }

  /** Creates or updates the reusable. Returns the saved reusable, or null on failure. */
  async function save(): Promise<Reusable | null> {
    if (!current.value) return null
    saving.value = true
    error.value = null
    const id = current.value.id
    const result = id ? await updateReusable(id, payload()) : await createReusable(payload())
    saving.value = false
    if (!result.success) {
      error.value = result.error.message
      return null
    }
    setCurrent(result.data)
    previewVersion.value = null
    return result.data
  }

  async function copy(): Promise<Reusable | null> {
    const id = current.value?.id
    if (!id) return null
    const result = await copyReusable(id)
    if (!result.success) {
      error.value = result.error.message
      return null
    }
    return result.data
  }

  async function remove(): Promise<boolean> {
    const id = current.value?.id
    if (!id) return false
    const result = await deleteReusable(id)
    if (!result.success) {
      error.value = result.error.message
      return false
    }
    return true
  }

  async function loadVersionPreview(id: number, versionNumber: number): Promise<boolean> {
    try {
      const asset = await getReusableVersion(id, versionNumber)
      // Keep the live tags and authorship: the version holds the design only.
      const live = current.value?.id === id ? current.value : null
      current.value = { ...asset.entityDTO, id, tags: live?.tags ?? asset.entityDTO.tags }
      design.value = parseReusableDesign(asset.entityDTO.data)
      savedSnapshot.value = snapshot()
      previewVersion.value = asset.versionDTO
      return true
    } catch (err) {
      logger.error(CONTEXT, 'loadVersionPreview failed', err)
      error.value = err instanceof Error ? err.message : String(err)
      return false
    }
  }

  async function clearPreviewVersion(): Promise<void> {
    const id = current.value?.id
    previewVersion.value = null
    if (id) await load(id)
  }

  /** Saves the previewed version's design as the reusable's current state. */
  async function savePreviewAsCurrent(): Promise<boolean> {
    if (!previewVersion.value || !current.value?.id) {
      logger.error(CONTEXT, 'Cannot save preview: not in preview mode')
      return false
    }
    previewVersion.value = null
    return (await save()) !== null
  }

  async function syncTags(newTags: Tag[]): Promise<boolean> {
    const id = current.value?.id
    if (!current.value || !id) return false
    const result = await syncAssetTags(current.value.tags ?? [], newTags, {
      assign: tagId => assignReusableTag(id, tagId),
      unassign: tagId => unassignReusableTag(id, tagId),
    })
    current.value.tags = result.tags
    if (!result.success) logger.error(CONTEXT, 'Tag synchronization failed', result.failures)
    return result.success
  }

  function reset() {
    current.value = null
    design.value = createEmptyDesign()
    previewVersion.value = null
    error.value = null
    savedSnapshot.value = ''
  }

  return {
    current,
    design,
    previewVersion,
    loading,
    saving,
    error,
    isDirty,
    isPreviewMode,
    createNew,
    load,
    save,
    copy,
    remove,
    loadVersionPreview,
    clearPreviewVersion,
    savePreviewAsCurrent,
    syncTags,
    reset,
  }
})
