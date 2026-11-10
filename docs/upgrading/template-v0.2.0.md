# template-website v0.2.0

The template moves from Azure Container Apps (an nginx image, built by the reusable workflows of `tl-platform`) to Cloudflare Pages. It brings back everything generic that the first live site on Pages built after it left the template: the workflows, the deploy-time scripts, the quality checks, the shared site code, and a protection rule that keeps every Environment except a public production out of search engines.

## Breaking

Yes, for repositories on v0.1.x. The hosting changes: the image, `nginx/`, `platform.yaml` and the `tl-platform` workflows are gone, so a repository can take this release only after its Cloudflare Pages project and its GitHub Environments exist. The Environments are named `dev`, `staging` and `production`. Other changes that break an update: the `release` skill is rewritten with other commands, the `articles` sample is replaced by the `services` list of items, and `src/` files are restructured. A repository that already runs on Pages (the pilot site) takes this release as a catch-up: most of its files already match.

## Requires

- A Cloudflare Pages project (Direct Upload), created by the infrastructure repository, with the production branch `production`.
- The GitHub Environments `dev`, `staging` and `production`, each with the variables `CLOUDFLARE_ACCOUNT_ID`, `PAGES_PROJECT` and `SITE_URL` and the secret `CLOUDFLARE_API_TOKEN`; `production` with required reviewers. See [deployment.md](../deployment.md#set-up-and-tear-down).
- A tag ruleset for `v*` that allows no update and no deletion.
- No `tl-platform` workflow is called any more. `renovate.json` no longer extends a `tl-platform` preset.

## Changes by ownership

### platform

- **`.github/workflows/`**: `deploy.yml` is removed. New: `ci.yml` (replaced), `checks.yml`, `deploy-dev.yml`, `deploy-staging.yml`, `pages-deploy.yml`, `release.yml` (replaced) and `promote.yml`. No workflow uses `tl-platform` any more.
- **`.github/actions/setup/`**: Node 22, pnpm from `packageManager`, the dependencies from the lock file.
- **`scripts/write-config.mjs`, `scripts/check-noindex.mjs`** and tests: the deploy-time settings and the **search-engine rule**: only `production` with `ROBOTS_INDEX=true` is indexable. Every other deploy gets `X-Robots-Tag: noindex, nofollow` on every response, a robots meta tag on every page, `robots.txt` with `Disallow: /` and no sitemap, whatever the variables say. The Environment is the one the workflow deploys to, never a variable. `scripts/check-noindex.mjs` proves it on the real build.
- **`scripts/version.mjs`, `version.test.mjs`, `status.mjs`**: the release versions and `pnpm status`.
- **`renovate.json`**: self-contained (weekly, pinned, 3 days old at least, grouped).
- **`.agents/skills/release/`, `.claude/skills/release/`**: rewritten. The release is the *Release new version* workflow, not a tag a person pushes. Commands: `release status`, `release deploy`, `release new`, `release promote`, `release rollback`.
- **`.agents/skills/update-from-template/`**: no longer mentions `app-workflows`; runs the checks of `ci / ci`.
- **`docs/upgrading/README.md`**: the ownership table names the new platform files.
- **Removed:** `Dockerfile`, `.dockerignore`, `nginx/`, `docker-entrypoint.d/`, `platform.yaml`, `platform.schema.json`, `.trivyignore`.

### shared

- **`package.json`**: Astro 7.3.3, Wrangler, Playwright, axe-core, pa11y-ci, Lighthouse CI, `@fontsource-variable/inter`, and the scripts `check:built`, `test:a11y` and `status`. The lock file is regenerated.
- **`astro.config.mjs`**: `build.format: "file"`, and a 301 from `/` to the default language through `dist/_redirects`. Addresses have no trailing slash.
- **`public/_headers`**: the security headers and caching of Cloudflare Pages.
- **`scripts/`**: `quality.mjs`, `ci-scope.mjs`, `check-browser.mjs`, `check-claims.mjs` and their tests.
- **`.pa11yci.json`, `lighthouserc.json`**: the accessibility and Lighthouse checks. The Lighthouse URLs are the sample pages: change them with the pages.
- **`eslint.config.js`, `.gitignore`**: ignore `.wrangler/`, `.quality/` and `.lighthouseci/`.
- **`docs/`**: rewritten for Pages (`deployment`, `architecture`, `configuration`, `getting-started`, `site-settings`); new `quality-checks` and `dependencies`.
- **`AGENTS.md`** and **`.github/pull_request_template.md`**: Pages rules; `pnpm test:a11y`.

### product

Shown as a suggestion only.

- **`src/site.config.ts` and `src/lib/site-settings.ts`**: new `themeColor` and `collections` (the lists of items), and `legalPages.sustainability`.
- **Lists of items:** `src/pages/[...lang]/[collection]/{index,[id]}.astro`, `src/components/ItemCard.astro` and `src/lib/items.ts` replace the `articles` sample; the sample collection is `services`.
- **New pages and components:** `sitemap.astro`, `sustainability.astro`, `ContactCta.astro`, `Logo.astro`.
- **Brand:** `src/styles/tokens.css` (colours, font) and `src/styles/global.css` (layout) replace the styles in `BaseLayout.astro`. `Logo.astro` and `public/favicon.svg` hold a neutral sample.
- **`BaseLayout.astro`:** Open Graph and Twitter metadata, a theme colour from the settings, a skip link, `main#main`.
- **`robots.txt.ts`:** blocks AI training crawlers; `EnvironmentBadge.astro`: hidden by default, never in production, shows the version; `config.ts`.
- **i18n:** interface-only packs for Croatian, Italian and Serbian; `ogLocale()` in `src/i18n/index.ts`; the interface strings no longer hold page copy.
- **Legal pages** show no date: the `updated` field is removed from the `legal` schema and the sample texts.
- **`README.md`:** rewritten for Pages; the mention of `docs/co2/` is removed.
- **`.github/CODEOWNERS`**: unchanged.

### template-only

- **`template-manifest.yaml`**: every path has an ownership; the new platform and shared files are listed.
- **`.agents/skills/release-template/`**: the breaking rules no longer mention `platform.yaml` or `app-workflows`.
- **`docs/template-releases.md`**: the same, and the row for this release.
- These notes.

## Upgrade steps

1. Make sure the Requires above are in place, on the infrastructure side. Until then do not take this release: it replaces the workflows that deploy.
2. Copy the `platform` paths, and delete the removed files.
3. Take the `shared` changes. In `package.json`, keep the site's own dependencies and take the template's versions of the rest; run `pnpm install` so the lock file follows, and `pnpm exec playwright install chromium` for the browser check. In `lighthouserc.json`, list the site's own pages.
4. Compare the `product` suggestions with the site's code. Move `articles` content to a list of items (or keep the `articles` collection and add it to `collections`), set `themeColor`, move the brand to `src/styles/tokens.css`, and remove `updated` from the legal pages and their schema.
5. In the repository settings, delete the secrets and variables only the old pipeline used, if the platform team says so.
6. Run `pnpm test` and `pnpm test:a11y`. Open the PR; the merge deploys to dev. Then run *Release new version* and check staging before promoting.
7. Write `.template-version` with `version: v0.2.0` and the tag's commit.
