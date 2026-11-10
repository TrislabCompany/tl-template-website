# Getting started

This guide runs the site on your machine, first with the Astro dev server and then the way Cloudflare Pages serves it, and runs the tests that `ci / ci` runs on every PR.

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

`pnpm test` runs `astro check`, which type-checks the pages and the content, the linter (`pnpm lint`), then the unit tests of the scripts (`pnpm test:unit`), `astro build` and the checks on the built site: the page-weight budget, `security.txt` ([site-settings.md](site-settings.md)), the claims of the legal pages (`scripts/check-claims.mjs`: no JavaScript in production, the published CO₂ figures), the search-engine rule (`scripts/check-noindex.mjs`: dev and staging stay noindex, nofollow even with `ROBOTS_INDEX=true`) and the browser check (`scripts/check-browser.mjs`: axe-core against WCAG 2.1 AA at desktop and 320 pixels, no sideways scrolling, no cookies or storage, no third-party requests). The browser check needs Chromium, once per machine: `pnpm exec playwright install chromium`. `ci / ci` runs `pnpm install --frozen-lockfile`, `pnpm exec playwright install --with-deps chromium`, then `pnpm test` and `pnpm test:a11y`, then Lighthouse CI, which runs on GitHub only.

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
| `curl -I http://localhost:8788/en` | The headers of `public/_headers`, and `X-Robots-Tag: noindex, nofollow` |
| <http://localhost:8788/robots.txt> | `Disallow: /`, because `local` is not production; the sitemap files are gone too |

Stop it with Ctrl+C. Run `pnpm build` again before you use `dist/` for anything else: `write-config.mjs` changed it.

## 6. Your first PR

1. Create a branch, change a page in `src/pages/[...lang]/` or an item in `src/content/services/<language>/`, and run `pnpm test`.
2. Push the branch and open a PR. The PR template asks for screenshots of the pages you changed.
3. `ci / ci` must pass, and a reviewer from the code owners must approve. Then squash-merge.

What happens after the merge is in [deployment.md](deployment.md).
