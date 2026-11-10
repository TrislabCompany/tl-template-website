# template-website v0.4.0

Adds the init script, `pnpm init-site`: the platform creates a new site's repository as a copy of this template, and the repository's first PR (branch `init-site`) runs the script with a `site.yaml` written from the site's intake. It turns the sample site into the site: it deletes the template-only and sample files and writes the site's settings, brand, README, code owners and `.template-version`. A CI job tests the script on every template change. The deploy workflows skip in a repository that is not initialised yet. Also a German interface pack, a new manifest class `sample`, and the last "robots header" wording of v0.3.0 is gone.

How a new site is initialised: [getting-started.md](../getting-started.md#a-new-site). The script, its input `site.yaml` and its schema `site.schema.json` exist only in the template: an `update-from-template` PR never brings them to a product repository.

## Breaking

No. No path that products use is removed or renamed, no linked `docs/` heading changes, no skill is added or renamed, and no variable or secret is new. One behaviour changes for a repository without `.template-version` (an untracked one): its deploy workflows now skip. `update-from-template` writes `.template-version` in its first PR, so every repository that takes an update deploys as before. Under `0.x` a feature is a minor version.

## Requires

Nothing new beyond v0.3.0. The infrastructure's repository creation copies the template's `main` as before.

## Changes by ownership

### platform

- **`.github/workflows/deploy-dev.yml`, `deploy-staging.yml`, `promote.yml`, `release.yml`**: a first job `initialised` reads whether `.template-version` exists; the existing jobs `needs` it and skip while it doesn't, in addition to the `is_template` guard. A freshly created repository therefore deploys nothing of the sample before its init PR is merged.
- **`.github/workflows/pages-deploy.yml`**: the comment no longer says the robots header differs between Environments.
- **`scripts/check-template-manifest.mjs`** and its tests: knows the class `sample` for paths (never for skills).

### shared

- **`template-manifest.yaml`** is template-only; see below.
- **`package.json`**: the script `init-site` and the dev dependency `ajv` 8.20.0 (JSON Schema validation of `site.yaml`). Both exist for the init script, which a site never has: a site made with the script has no `init-site` script but keeps `ajv` in `devDependencies`, so that its lock file stays valid. Nothing in a site uses `ajv`.
- **`docs/getting-started.md`**: "A new site", the init PR and the fields of `site.yaml`.
- **`docs/architecture.md`, `docs/deployment.md`, `docs/quality-checks.md`**: the "robots header" wording is removed; only `/config.json` (and in production the missing environment badge) is written per Environment.
- **`docs/site-settings.md`**: the language packs, now with German, and what `pnpm init-site` does to the sample list.

### product

Shown as a suggestion only.

- **`src/i18n/ui/de.ts`**, registered in `src/i18n/index.ts`: the German interface strings.
- **`src/components/LanguageSwitch.astro`, `src/i18n/index.ts`**: a type fix for a site with one language that isn't English (`other` is `never` in the switch's else branch, and `lang === "en"` has no overlap). Found by testing the init script with a one-language sample.
- **`src/pages/[...lang]/about.astro`**: the sample paragraph is a code comment now, so a new site shows no sample text there.
- **`README.md`**: the init step.
- **`pnpm-lock.yaml`**: the lock entries of `ajv` 8.20.0.

### template-only

- **`template-manifest.yaml`**: the class `sample`, with `src/content/services/**`; rules for the init script, its templates and `site.schema.json`, placed before the broad rules.
- **`site.schema.json`, `scripts/init-site.mjs`, `scripts/init-site.test.mjs`, `scripts/init/`** (templates and `sample-site.yaml`): the init script and everything it needs.
- **`.github/workflows/template-init.yml`**: copies the template, runs `pnpm init-site` with `scripts/init/sample-site.yaml`, then `pnpm install`, `pnpm test` and `pnpm test:a11y` on the result, for two samples: three languages with a list, and one language (no prefix, no language switch).
- **`docs/template-releases.md`**: the class `sample`, "The init script", and the row for this release.
- These notes.

## Upgrade steps

For a repository that exists (it was customised by hand or initialised):

1. Take the `platform` changes: replace the four deploy and release workflows, `pages-deploy.yml` and the manifest check with its tests.
2. Take the `shared` changes: the docs, and `package.json` without the `init-site` script and `ajv`: they are for the init script, which a site doesn't have.
3. Compare the `product` suggestions: the German pack if the site needs it, and the about page.
4. Check that `.template-version` exists: from now on the deploy workflows skip without it.
5. Run `pnpm test` and `pnpm test:a11y`. Write `.template-version` with `version: v0.4.0` and the tag's commit.

For a new site nothing is done by hand: the platform copies the template's `main` and the init PR (`handoff-apply`) runs the script.
