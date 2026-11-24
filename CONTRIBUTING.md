# Contributing to ATLAS v3.0

Thanks for helping with Atlas3. This page explains how a change goes from an idea to a merged pull request. For setting up a development environment, see [Setup](README.md#setup) in the README.

Atlas3 is currently maintained by [@chrisknoll](https://github.com/chrisknoll) and [@p-hoffmann](https://github.com/p-hoffmann). They review pull requests and decide what gets merged.

## Before you start

- **Look for existing work.** Search the open [issues](https://github.com/OHDSI/Atlas3/issues) and [pull requests](https://github.com/OHDSI/Atlas3/pulls) first. If someone is already on it, comment there rather than starting a parallel fix.
- **Say what you are working on.** For a bug, comment on its issue, or open one, before you start, so others know it is taken. This matters most when `develop` itself is failing, since several people are likely to notice at the same time.
- **Discuss larger changes first.** For a new feature, a change to how something works, or anything that touches the cohort expression format or WebAPI, open an issue or a [discussion](https://github.com/OHDSI/Atlas3/discussions) before writing much code. Agreeing on the approach first saves a rewrite later.

## Making a change

1. Branch from `develop`. External contributors work from a fork; committers can push branches to this repository.
2. Keep each pull request to one change. A focused PR is reviewed faster than one that mixes a feature, a refactor and unrelated fixes.
3. Add or update tests with the code. See the [testing guide](docs/testing-guide.md) for what the tests are expected to check.
4. Put user-facing text in `src/locales/en.json` and use it through `t()`. Don't write English inline. The [i18n guide](docs/i18n.md) covers naming keys and the translation workflow.
5. If you add or change a route, run `npm run generate:routes` and commit the updated `src/router/routes.manifest.json`.

### Checks to run locally

```bash
npm run check-all      # type-check, lint, i18n:check, unit tests, production build
npm run routes:check   # the route manifest is up to date
npm run test:e2e       # end-to-end tests, for changes to pages and flows
```

The pre-commit hook runs `npm run lint`.

## Opening a pull request

- Target `develop`.
- In the description, say what changes and why, and how you tested it. Link the issue or discussion it comes from. For UI changes, add a screenshot or a short recording.
- Open the PR as a **draft** while it is still in progress or you want early feedback on the approach. Mark it ready for review once you consider it done.

### Required checks

`develop` requires these to pass before anything is merged:

- `Lint and Type Check`
- `unit-tests`
- `e2e-tests`
- `build-and-publish`
- Code coverage of at least 90%
- CodeQL: no new errors, and no new security alerts of medium severity or higher

Other workflows, such as the phenotype integration and mutation tests, also run on pull requests. Look into any failure they report, even where it doesn't block the merge.

## Review and merge

- Opening a pull request requests a review from both maintainers automatically ([`.github/CODEOWNERS`](.github/CODEOWNERS)).
- **A pull request needs an approving review from one of the maintainers before it is merged.** This applies to committers with write access too: don't merge your own PR without that approval. A maintainer's own PR is reviewed by the other maintainer.
- An approval also tells you the change is wanted, so it is worth keeping the PR up to date until it lands.
- Reviews are done by volunteers, and there is no fixed response time. If a PR has had no response for two weeks, feel free to ping the maintainers on it.
- Maintainers say clearly in a comment when a PR needs changes, or when it isn't planned. A PR that isn't planned is closed, by the author or by a maintainer.

### Merging

- Pull requests are merged by **squash** or **rebase**. Merge commits are not allowed, and `develop` keeps a linear history.
- `develop` requires signed commits. A squash merge is signed by GitHub, so it always works. A rebase merge works only when every commit in the PR is signed.
- The branch is deleted automatically after the merge.

### Keeping a PR up to date

`develop` moves quickly. You don't need to rebase after every change to `develop`: the required checks don't require the branch to be up to date. Rebase, or merge `develop` into your branch, when there are conflicts or a reviewer asks for it.

## Reporting bugs and asking questions

Use the [issue tracker](https://github.com/OHDSI/Atlas3/issues) for bugs and feature requests, and [discussions](https://github.com/OHDSI/Atlas3/discussions) for questions and proposals. For a bug, include the steps to reproduce it, what you expected and what happened, and the Atlas3 and WebAPI versions you are using.
