# Atlas Document Editor Principles

1. **The cohort definition is the single source of truth.**  
   Treat the cohort definition as one reactive, serializable document. Components should edit the document directly rather than creating parallel ViewModels or duplicate representations of document state.

2. **Components directly edit the portion of the document they own.**  
   A component responsible for editing a model object may directly mutate that object's properties. Do not introduce events or synchronization layers merely to propagate model changes upward.

3. **Keep document state separate from UI state.**  
   Only data that belongs in the serialized cohort definition should live in the document. Selection, expansion, temporary input, focus, and other presentation state belong in component-local state or composables.

4. **Preserve the sparse JSON model.**  
   Do not populate optional properties merely because they exist in the schema. Create properties when the user adds or enables them, and remove properties when the user removes or disables them.

5. **Initialize models before handing them to editors.**  
   A component should receive a valid model for the thing it edits. Parents or model-creation logic should create and initialize sparse objects before rendering the corresponding editor. Child components should not need defensive `undefined` handling for required models.

6. **Prefer direct `v-model` binding.**  
   When the UI value and model value have compatible semantics, bind the input directly to the reactive model. Do not create computed getter/setters solely to forward assignments.

7. **Normalize at the UI boundary.**  
   When an input's representation differs from the document's representation—such as `""` becoming `undefined` or `"65"` becoming `65`—perform that normalization in the input or binding layer, not in the reactive document.

8. **Use `computed()` for derivation, not synchronization.**  
   Use computed values to derive state from the document or UI state. Do not use computed getter/setters simply to mirror properties that could be bound directly.

9. **Use watchers for reactions, not state synchronization.**  
   A watcher should respond to a meaningful change or perform a side effect. Do not use watchers to keep duplicate copies of the same state synchronized.

10. **Use `:key` to represent editing identity.**  
    When a component begins editing a different object, use a meaningful `:key` to establish a new component instance rather than adding watchers solely to reset local state.

11. **Use events for actions, not model-change notifications.**  
    Events should communicate actions or intentions such as `add`, `remove`, `select`, `edit`, or `move`. Do not emit events such as `model-updated` or `value-changed` merely to report mutations that are already observable through the reactive document.

12. **Avoid event propagation through uninterested components.**  
    Do not require intermediate components to know about and re-emit events from descendants unless the intermediate component has a legitimate responsibility for that action. Prefer shared document state, composables, or an appropriate higher-level action boundary when events would otherwise need to travel through unrelated components.

13. **Keep behavior at the appropriate level.**  
    A component should own behavior associated with the portion of the document it edits. Higher-level components should coordinate higher-level operations rather than micromanaging individual field mutations.

14. **Make document mutations explicit.**  
    Create, delete, add, remove, and reorder operations should have clear mutation boundaries. Avoid hidden synchronization or mutations spread across unrelated components.

15. **Preserve undo/redo as an architectural possibility.**  
    Document mutations should be structured so they can eventually be recorded as reversible user operations. Prefer meaningful mutation boundaries that can be grouped into a single user action or transaction.

16. **Keep Vue implementation details out of the document.**  
    The cohort definition should remain ordinary serializable data. Do not place refs, computeds, component instances, UI state, or other Vue-specific constructs into the document.

17. **Prefer less synchronization over more synchronization.**  
    When deciding between two implementations, prefer the one that reduces synchronization between copies of state and keeps the reactive document as the authoritative source of truth.
