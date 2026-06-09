# Vue Component Testing HOWTO

This guide describes the preferred testing style for Vue SFCs in Atlas3.

Primary rule: test components through user-observable behavior (DOM, events, and collaborator calls), not by mutating internal component instance state.

## Why this style

- Tests remain stable when internal refs/method names change.
- Tests verify real behavior paths users trigger.
- Tests avoid brittle and noisy `wrapper.vm` typing issues from `<script setup>` internals.

## The testing pyramid for SFC unit tests

For a component test, prefer this order:

1. Arrange public inputs.
2. Interact through rendered UI or emitted child events.
3. Assert rendered output and external side effects.

Public inputs include:

- Props (for prop-driven components).
- Store state (for store-driven components).
- Service mocks and API responses.

External side effects include:

- Service calls (for example `authService.login`).
- Store mutations.
- Emitted events.

## Example: LoginModal.vue

Reference test file: `tests/unit/components/auth/LoginModal.spec.ts`.

### Good patterns used

1. Open the modal through store state (real component path):

```ts
authStore.loginModalOpen = true
await flushPromises()
```

2. Select providers by clicking rendered buttons:

```ts
await providerButtons()[1].trigger('click')
```

3. Submit credentials through the child form contract:

```ts
await wrapper.get('[data-testid="credentials-form"]').trigger('submit')
```

4. Assert collaborator behavior:

```ts
expect(authService.login).toHaveBeenCalledWith(ajaxProvider, undefined)
```

5. Assert user-visible state:

```ts
expect(wrapper.find('[role="alert"]').exists()).toBe(true)
```

### Patterns to avoid

Avoid direct manipulation of component internals in tests:

- `wrapper.vm.selectedProvider = ...`
- `wrapper.vm.selectProvider(...)`
- `wrapper.vm.handleLogin(...)`
- tests that only check internal method/property existence

These patterns bypass the component's real interaction flow.

## Using stubs correctly

Stubs are acceptable when they preserve the same contract as real child components.

Example from `LoginModal.spec.ts`:

- `CredentialsForm` is stubbed, but still emits `submit` with credentials.
- UI wrapper components are stubbed to keep tests lightweight.

The key is to keep the parent-child interaction contract intact.

## Practical checklist for new SFC tests

1. Can the test set up state via props/store/mocks instead of `wrapper.vm`?
2. Can it trigger behavior with `trigger('click')`, `trigger('submit')`, or child `$emit`?
3. Does it assert visible UI and side effects, not implementation details?
4. Does it avoid assertions like "method exists" unless there is a specific reason?

## Suggested template

```ts
it('does something user-visible', async () => {
	// Arrange
	vi.mocked(service.fetchData).mockResolvedValue([...])
	const wrapper = mountComponent()

	// Act
	await wrapper.get('[data-testid="action-button"]').trigger('click')
	await flushPromises()

	// Assert
	expect(wrapper.get('[role="status"]').text()).toContain('Done')
	expect(service.save).toHaveBeenCalledWith(expectedPayload)
})
```

## Notes for Atlas3

- Keep tests focused: one behavior per test.
- Mock network/service boundaries, not core Vue behavior.
- Prefer `flushPromises()` when opening dialogs/components that trigger async watchers.
- Keep provider and credential fixtures local and explicit for readability.
