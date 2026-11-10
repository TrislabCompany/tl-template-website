# template-website v0.3.0

Removes the search-engine protection layer that v0.2.0 added to the deploy, drops the Azure figure from the yearly CO₂ note, makes the deploy and release workflows skip in the template repository, and fixes two sample texts. dev and staging are protected by Cloudflare Access, which the infrastructure enforces, so the deploy no longer touches `robots.txt`, the sitemap or the headers.

No product repository is on v0.2.0 yet: products should go straight to v0.3.0, not stop at v0.2.0.

## Breaking

Yes. Two things that v0.2.0 had are gone: the variable `ROBOTS_INDEX` is no longer read, and `scripts/co2-estimate.mjs` no longer accepts `--azure-kg`, `--azure-period` and `--azure-source`. Under `0.x` a breaking change is a minor version. `scripts/check-noindex.mjs` is removed, and `pnpm test` no longer runs it.

## Requires

Nothing new beyond v0.2.0: the Cloudflare Pages project, and the GitHub Environments `dev`, `staging` and `production` with their variables and secret ([deployment.md](../deployment.md#set-up-and-tear-down)). The infrastructure may still set `ROBOTS_INDEX` on the GitHub Environments; it now has no effect and can be removed there.

## Changes by ownership

### platform

- **`scripts/write-config.mjs`** and its tests: it writes `config.json` from the `PLATFORM_*` and `PUBLIC_*` settings and takes the environment badge out of production, and nothing else. It no longer adds `X-Robots-Tag` to `_headers`, a robots meta tag to the pages, or a closed `robots.txt`, and it no longer deletes the sitemap. `ROBOTS_INDEX` is no longer read. The Environment still comes only from the process, never from a variable, and only the name `production` counts as production (the badge no longer accepts `prod`).
- **`scripts/check-noindex.mjs`**: removed.
- **`.github/workflows/deploy-dev.yml`, `deploy-staging.yml`, `release.yml`, `promote.yml`**: in a template repository (`github.event.repository.is_template`) every job is skipped, because a template deploys nowhere. In a repository made from the template they run as before.

### shared

- **`package.json`**: `check:built` no longer runs `check-noindex.mjs`.
- **`scripts/co2-estimate.mjs`** and its tests: the `--azure-*` options and the "Cloud part" of the note are removed. The note is the web part only (Sustainable Web Design v4, CO2.js).
- **`scripts/quality.mjs`**: serves `dist/` as before, without `ROBOTS_INDEX`; the new variable `QUALITY_PORT` sets another port than 8788 when that one is taken.
- **`scripts/ci-scope.mjs`** and its test: no longer knows `check-noindex.mjs`.
- **`public/_headers`**: its comment no longer says that the deploy adds the robots header.
- **`docs/`**: `deployment.md` loses "Search engines" and "Making the site public" no longer sets `ROBOTS_INDEX`; `architecture.md`, `configuration.md`, `getting-started.md` and `site-settings.md` follow. The CO₂ section describes the page estimate only.
- **`AGENTS.md`**: no longer names the search-engine rule.

### product

Shown as a suggestion only.

- **`src/content/legal/<language>/privacy.md`**: the sample text names Cloudflare as the processor that serves the site and keeps technical logs, with a placeholder to adapt.
- **`src/pages/robots.txt.ts`**: the comment says the file is the same in every Environment.
- **`src/components/EnvironmentBadge.astro`**: only `production` hides the badge, not `prod`.
- **`README.md`**: no longer lists the search-engine rule.

### template-only

- **`template-manifest.yaml`**: `scripts/check-noindex.mjs` is removed from the rules.
- **`docs/template-releases.md`**: the row for this release.
- These notes. The notes of v0.2.0 stay as released.

## Upgrade steps

1. Take the `platform` changes: replace the four workflows and `scripts/write-config.mjs` with its tests, and delete `scripts/check-noindex.mjs`.
2. Take the `shared` changes. If the site changed `package.json`, remove `node scripts/check-noindex.mjs` from `check:built`. If it runs `pnpm co2` with `--azure-*` options, drop them; an existing note in `docs/co2/` is not touched.
3. Compare the `product` suggestions with the site's code: the privacy text (adapt the Cloudflare paragraph to the site's processing), and `"prod"` in the badge.
4. In the repository settings or the infrastructure repository, `ROBOTS_INDEX` may be removed from the GitHub Environments. Nothing else switches indexing on: keep Cloudflare Access in front of `dev` and `staging`.
5. A repository still on v0.1.x follows the steps of [v0.2.0](template-v0.2.0.md) for everything except what is listed above, and ends on v0.3.0.
6. Run `pnpm test` and `pnpm test:a11y`. Write `.template-version` with `version: v0.3.0` and the tag's commit.
