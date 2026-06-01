# Refined Enterprise Vue.js + Vite SPA Structure

## Core Architectural Philosophy

The application structure should primarily communicate:
> what the application DOES

rather than:
> which framework mechanisms implement it.

The stable organizational concept in a large SPA is:
- business functionality
- workflows
- bounded domains

NOT:
- stores
- services
- DTOs
- composables
- framework concepts

---

# Recommended Top-Level Structure

```text
src/
  app/
  components/
  authentication/
  vocabulary/
  concept-sets/
  cohort-definition/
  characterization/
  incidence-rate/
```

This structure intentionally avoids introducing an additional `features/` wrapper folder.

The reasoning is:
- every top-level domain folder already represents a feature
- adding `features/` creates unnecessary nesting
- the root structure itself should communicate the major application capabilities

This creates:
- flatter navigation
- clearer discoverability
- stronger conceptual ownership

---

# app/

The `app/` folder contains:
- application bootstrap
- router assembly
- plugin registration
- layouts
- global initialization logic

Examples:

```text
app/
  router/
  layouts/
  plugins/
  bootstrap/
```

This folder represents:
- application infrastructure
- shell-level concerns

not business functionality.

---

# components/

The `components/` folder contains:
- reusable feature-agnostic UI primitives
- shared infrastructure components
- generic controls

Conceptually, these can be viewed as:
> features that do not belong to a single domain

Examples:

```text
components/
  data-table/
  modal/
  pagination/
  loading-spinner/
  confirmation-dialog/
  facet-filter/
  date-picker/
```

These are:
- reusable building blocks
- infrastructure-level UI components

NOT:
- business-domain components

---

# Domain-Level Folders

The remaining top-level folders represent:
- business capabilities
- workflows
- bounded contexts
- application functionality

Examples:

```text
authentication/
vocabulary/
concept-sets/
cohort-definition/
characterization/
incidence-rate/
```

These become the PRIMARY organizational structure of the application.

---

# Domain Folder Philosophy

Inside a domain folder:
- colocate related files together
- keep functionality physically near itself
- avoid excessive technical-layer subfolders

Avoid structures like:

```text
stores/
views/
services/
types/
dto/
```

because they recreate horizontal architecture inside the feature.

Instead, organize around:
- conceptual cohesion
- workflow locality
- domain understanding

---

# Preferred Domain Structure

Example:

```text
vocabulary/
  VocabularyPage.vue
  VocabularySearchPanel.vue
  VocabularyResultsTable.vue
  vocabularyStore.ts
  vocabularyApi.ts
  vocabularyRoutes.ts
  useVocabularySearch.ts
  vocabularyTypes.ts
```

This keeps:
- UI
- state
- routing
- API access
- composables
- types

all physically close together.

The goal is:
> locality of understanding

---

# Subfolders Should Represent Functional Decomposition

Subfolders are still valuable when:
- a domain becomes large
- the functionality naturally decomposes into subdomains

Example:

```text
cohort-definition/
  expression-editor/
    ExpressionEditor.vue
    CriteriaGroup.vue
    expressionStore.ts
    conceptSetIntegration.ts

  inclusion-rules/
    InclusionRulesEditor.vue
    ruleEvaluation.ts

  generation/
    GenerationPanel.vue
    generationApi.ts

  cohortDefinitionRoutes.ts
```

Notice the subfolders represent:
- business concepts
- workflows
- sub-features

NOT:
- framework mechanisms.

---

# Important Architectural Guideline

A critical rule for long-term maintainability:

> Default to domain-local unless proven globally reusable.

Avoid prematurely centralizing:
- composables
- stores
- services
- DTOs
- utilities

Over-centralization creates:
- coupling
- unclear ownership
- dependency tangles
- difficult refactoring

---

# Why This Structure Works Well With Vue + Vite

This architecture aligns naturally with:
- Vue 3
- Composition API
- Pinia
- TypeScript
- Vite

Because modern Vue encourages:
- component locality
- explicit imports
- modular encapsulation
- feature ownership

And Vite handles:
- large module graphs
- deep folder structures
- code splitting
- lazy loading

extremely efficiently.

Modern tooling no longer requires:
- flattened source trees
- giant shared folders
- global technical-layer organization

---

# Recommended Architectural Direction

## Organize Around:
- workflows
- business capabilities
- bounded contexts
- domain ownership

## Avoid Organizing Around:
- framework implementation layers
- stores
- services
- DTOs
- views
- composables

The framework is an implementation detail.

The domain is the architecture.

---

# Final Recommended Structure

```text
src/
  app/
    router/
    layouts/
    plugins/

  components/
    data-table/
    modal/
    pagination/
    loading-spinner/
    facet-filter/

  authentication/

  vocabulary/
    VocabularyPage.vue
    VocabularySearchPanel.vue
    VocabularyResultsTable.vue
    vocabularyStore.ts
    vocabularyApi.ts
    vocabularyRoutes.ts

  concept-sets/

  cohort-definition/
    expression-editor/
    inclusion-rules/
    generation/

  characterization/

  incidence-rate/
```

And only introduce additional subfolders when:
- the business functionality itself becomes large enough to justify decomposition.

---

# Final Guiding Principle

The folder structure should help developers answer:

> "Where would I go to work on vocabulary?"

not:

> "Where are all the stores?"
