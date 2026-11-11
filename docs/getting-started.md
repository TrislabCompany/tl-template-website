# Getting started

This guide runs the site on your machine, first with the Astro dev server and then the way Cloudflare Pages serves it, and runs the tests that `ci / ci` runs on every PR.

## A new site

You don't create a site's repository yourself, and you don't customise the copy of the template by hand. Two steps make a new site:

1. **The platform creates the repository.** The onboarding PR in `tl-cloud-infrastructure` makes the pipeline copy the template's `main` into a new repository (`<tenant>-website-<product>`), with its team, rules, Cloudflare Pages project and the Environments `dev`, `staging` and `production`. The copy is still the template's sample site. Its deploy workflows skip while the repository has no `.template-version`, so nothing of the sample is deployed.
2. **The init PR turns the copy into the site.** Its branch is `init-site`. It is made by running the init script with a `site.yaml`:

   ```sh
   pnpm install
   cp <the site's site.yaml> site.yaml
   pnpm init-site          # --dry-run lists what it would do and changes nothing
   pnpm test
   ```

   `site.yaml` holds the site's published facts and is written from the site's intake (`tl-product-ideas`, `handoff-apply`). `site.schema.json` describes it; `scripts/init/sample-site.yaml` is an example. The script checks it first and changes nothing when it is wrong. Then it:

   - deletes every path of the manifest classes `template-only` and `sample` (`template-manifest.yaml`, which only the template has): the template's release skill and notes, the sample list `services`, and the script itself with its templates, `site.schema.json` and `site.yaml`;
   - writes `src/site.config.ts`, `src/content.config.ts` (one collection for each list in `collections`), the brand values of `src/styles/tokens.css`, `README.md`, the header of `AGENTS.md`, `.github/CODEOWNERS`, the package name, the pages of `lighthouserc.json` and `.template-version`;
   - drops the language packs (`src/i18n/ui/`) and the legal text drafts of the languages the site doesn't have (`en` stays: it defines the strings' type), and gives each language without a draft a copy of the default language's;
   - sets the `security.txt` expiry just under a year ahead.

   The result builds and passes `pnpm test`. Commit it, open the PR and, once it is merged, the first deploy to `dev` runs.

| `site.yaml` field | Meaning | Required |
| --- | --- | --- |
| `name`, `domain`, `repo`, `github_team` | The site's name, its production domain, `<owner>/<repository>` and the code owners team | yes |
| `template.version`, `template.commit` | The template release the copy comes from, for `.template-version` | yes |
| `languages`, `description` | The languages (default first; `sl`, `en`, `hr`, `sr`, `it`, `de`) and the page description in each | yes |
| `company` | Name, legal name, address, registration and VAT numbers, imprint notes, profiles: published data only | name, legal name, address |
| `contact` | Role mailboxes by topic, the security mailbox, a map link: never a person's name, address or phone number | topics, security mailbox |
| `legal_pages`, `structured_data` | Which legal pages exist; `Organization`, `LocalBusiness` or `none` | no |
| `collections` | The lists of items (at least one), with titles and lead sentences per language | yes |
| `theme` | The brand colours and the address bar colour; the sample's neutral colours stay where none is given | no |

A site has no budget, prices or personal data in `site.yaml`: the schema has no field for them. The script and `site.yaml` exist only in the template, so a product repository never gets them from `update-from-template`.

An empty list builds with a warning (`The collection "services" does not exist or is empty`) until its first item is added in `src/content/<id>/<language>/`.

The rest of this page is for working on a site that exists.

## 1. What you need

| Tool | Version | Check |
| --- | --- | --- |
| Node.js | 22 | `node --version` |
| pnpm | The version in `packageManager` of `package.json` | `pnpm --version` |

pnpm comes with Node through Corepack. Run `corepack enable` once, and pnpm then uses the version `package.json` names.

## 2. Run the site with the dev server

```sh
pnpm install
pnpm dev
```

Open <http://localhost:4321>. The page reloads when you save a file. The dev server has no `/config.json`, so the footer shows `Environment: local` (see [configuration.md](configuration.md)).

## 3. Run the tests

```sh
pnpm test
```

`pnpm test` runs `astro check`, which type-checks the pages and the content, the linter (`pnpm lint`), then the unit tests of the scripts (`pnpm test:unit`), `astro build` and the checks on the built site: the page-weight budget, `security.txt` ([site-settings.md](site-settings.md)), the sitemap (`scripts/check-sitemap.mjs`: every address a built page with the same canonical address and language alternates, none marked noindex, [search-engines.md](search-engines.md)), the claims of the legal pages (`scripts/check-claims.mjs`: no JavaScript in production, the published CO₂ figures) and the browser check (`scripts/check-browser.mjs`: axe-core against WCAG 2.1 AA at desktop and 320 pixels, no sideways scrolling, no cookies or storage, no third-party requests, and with [analytics](analytics.md) one page view on the production host only). The browser check needs Chromium, once per machine: `pnpm exec playwright install chromium`. `ci / ci` runs `pnpm install --frozen-lockfile`, `pnpm exec playwright install --with-deps chromium`, then `pnpm test` and `pnpm test:a11y`, then Lighthouse CI, which runs on GitHub only.

Then run the accessibility check on the built site (you need Chrome; see [quality-checks.md](quality-checks.md)):

```sh
pnpm test:a11y
```

## 4. Build the static files

```sh
pnpm build
pnpm preview
```

`pnpm build` writes the site to `dist/`. `pnpm preview` serves `dist/` at <http://localhost:4321>.

## 5. Run the site as Cloudflare Pages serves it

`wrangler pages dev` serves `dist/` with the same routing and `_headers` as Cloudflare Pages. First write the settings of an Environment into the build, as a deploy does:

```sh
pnpm build
PLATFORM_ENVIRONMENT=local PUBLIC_GREETING=hello node scripts/write-config.mjs dist
pnpm exec wrangler pages dev dist --port 8788
```

Then check it:

| Request | Answer |
| --- | --- |
| <http://localhost:8788/> | Leads to the default language, `/en` |
| <http://localhost:8788/en/about> | The about page |
| <http://localhost:8788/en/about/> | A redirect (308) to `/en/about` |
| <http://localhost:8788/no-such-page> | The site's 404 page, with status 404 |
| <http://localhost:8788/config.json> | `{"PLATFORM_ENVIRONMENT":"local","PUBLIC_GREETING":"hello"}` |
| `curl -I http://localhost:8788/en` | The headers of `public/_headers` |

Stop it with Ctrl+C. Run `pnpm build` again before you use `dist/` for anything else: `write-config.mjs` changed it.

## 6. Your first PR

1. Create a branch, change a page in `src/pages/[...lang]/` or an item in `src/content/services/<language>/`, and run `pnpm test`.
2. Push the branch and open a PR. The PR template asks for screenshots of the pages you changed.
3. `ci / ci` must pass, and a reviewer from the code owners must approve. Then squash-merge.

What happens after the merge is in [deployment.md](deployment.md).
