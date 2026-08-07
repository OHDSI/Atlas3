# End-to-end coverage gaps

These suites are disabled with `test.describe.skip` and do not run in CI. Each
was skipped when the routes it drove changed and was never re-enabled. Every
one needs `tests/e2e/helpers/api-mocks.ts` fixtures for its feature before it
can be turned back on.

| Suite | Feature with no e2e coverage |
| --- | --- |
| `tests/e2e/pathways-list.spec.ts` | Pathways browse and create |
| `tests/e2e/pathways-editor.spec.ts` | Pathways design |
| `tests/e2e/pathways-generation.spec.ts` | Pathways generation and results |
| `tests/e2e/incidence-rate-workbench.spec.ts` | Incidence rate design, generation, export |
| `tests/e2e/characterization-workbench.spec.ts` | Characterization workbench and results |

Until these are re-enabled, the README's claim of comprehensive end-to-end
coverage does not hold for Pathways, Incidence Rates, or Characterization.
