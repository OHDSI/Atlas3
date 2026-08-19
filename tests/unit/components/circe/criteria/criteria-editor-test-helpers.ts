import { nextTick } from 'vue'

type EditorWrapper = any

export async function openMenu(wrapper: EditorWrapper, buttonSelector: string) {
  await wrapper.get(buttonSelector).trigger('click')
  await nextTick()
}

export function menuItemTexts(wrapper: EditorWrapper) {
  return wrapper.findAllComponents({ name: 'AtlasListItem' }).map(item => item.find('.v-list-item-title').text())
}

export async function expectMenuItemPresent(wrapper: EditorWrapper, label: string) {
  expect(menuItemTexts(wrapper)).toContain(label)
}

export async function expectMenuItemAbsent(wrapper: EditorWrapper, label: string) {
  expect(menuItemTexts(wrapper)).not.toContain(label)
}

export async function selectMenuItem(wrapper: EditorWrapper, label: string) {
  const item = wrapper.findAllComponents({ name: 'AtlasListItem' }).find(node => node.find('.v-list-item-title').text() === label)
  expect(item, `missing menu item ${label}`).toBeTruthy()
  await item!.trigger('click')
  await nextTick()
}

export async function chooseConceptSet(
  conceptSetSelection: EditorWrapper,
  wrapper: EditorWrapper,
  selectedId = 1,
) {
  const picker = conceptSetSelection.get('[data-testid="concept-set-picker"]')
  await picker.trigger('click')
  await nextTick()

  const target = wrapper.emitted('select-concept-set')?.slice(-1)[0]?.[0]?.targetRef
  expect(target, 'missing select-concept-set targetRef').toBeTruthy()
  target.value = selectedId
  await nextTick()

  return target
}

export async function removeActiveAttribute(wrapper: EditorWrapper) {
  await wrapper.get('.attribute-actions .v-btn').trigger('click')
  await nextTick()
}