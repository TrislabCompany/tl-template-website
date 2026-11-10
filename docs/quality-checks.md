# Quality checks

Every commit pushed to a PR, and every push to `main`, runs the required check `ci / ci` (`.github/workflows/checks.yml`). The PR cannot merge unless the steps it needs pass ([What runs for a PR](#what-runs-for-a-pr)):

| Step | Where it runs | What it checks |
| --- | --- | --- |
| `pnpm test` | GitHub and locally | Types and content (`astro check`), lint, the unit tests of `scripts/`, `astro build`, then the page-weight budget and `security.txt` on `dist/` ([getting-started.md](getting-started.md)) |
| Accessibility, `pnpm test:a11y` | GitHub and locally | pa11y-ci on every page |
| Lighthouse CI | **GitHub only** | Lighthouse scores and Core Web Vitals |

Both checks run once `dist/` is built, even if the other one fails, so one CI run reports everything. `scripts/quality.mjs` runs both of them. It copies `dist/` to `.quality/site`, sets the copy up as production with `scripts/write-config.mjs` (`/config.json`, no environment badge), and serves it with `wrangler pages dev` on port 8788. So `public/_headers` applies, the Content-Security-Policy among them, as on Cloudflare Pages.

## What runs for a PR

The full run takes about 7 minutes, most of it pa11y and Lighthouse. So on a PR, `scripts/ci-scope.mjs` reads the files the PR changes and runs only the steps they need. The job `ci / ci` always runs and reports, even when it skips every step, so the required check never waits. The job summary lists what ran, what was skipped and which pages were checked.

| The PR changes | What runs |
| --- | --- |
| Only `docs/`, `*.md` in the root, `renovate.json`, the deploy and release workflows | Nothing |
| A content page, `src/content/<collection>/<language>/<page>.md` | `astro check`, the build, the checks on the built site, then pa11y and Lighthouse **only on the pages it shows on**: its own, the list of its collection, the home page and the sitemap page of that language |
| Anything else in `src/` or `public/`, `astro.config.mjs`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json` | Everything, on every page |
| A script in `scripts/` | Lint and the unit tests, and the check the script implements (the built-site checks, pa11y, Lighthouse) |
| `.pa11yci.json` or `lighthouserc.json` | The build and that check |
| `ci.yml`, `checks.yml`, `.github/actions/`, or a file the script doesn't know | Everything |

Every push to `main` runs everything on every page, whatever the PR ran. A merged PR that broke something the scope skipped shows up there before anything is released. If a file needs another rule, change `checksFor` in `scripts/ci-scope.mjs` and its test.

Locally, `pnpm test` still runs everything. To check only some pages: `QUALITY_PAGES="/en/privacy /sl/privacy" pnpm test:a11y`.

## Accessibility: pa11y-ci

- **Pages:** every URL in `dist/sitemap-*.xml`, so every page in every language.
- **Rules:** WCAG 2 AA, with two engines, axe-core and HTML_CodeSniffer. Only errors fail the check; warnings and notices don't.
- **Settings:** `.pa11yci.json`. `concurrency` stays at 1 because pa11y-ci 5 fails pages at random when it checks several at once.

pa11y-ci is a machine check. It finds missing alt text, low contrast, missing labels, a wrong heading order or a missing `lang`. It doesn't replace a person with a keyboard and a screen reader. The accessibility statement (`src/content/legal/*/accessibility.md`) still needs that manual review once a year.

## Performance and Core Web Vitals: Lighthouse CI

**Lighthouse CI (LHCI)** runs on the GitHub runner only. Lighthouse timings depend on the machine, so the limits are set for the runner and are checked only there. On a busy laptop the same page scores lower, which would make local results misleading.

**Pages:** the list in `lighthouserc.json` (`ci.collect.url`): the home page in English and Slovenian, about, the sample list and its first item, contact and sustainability. Change the list when the site has other pages. Each page runs 3 times, and the limits apply to the median run. Lighthouse uses its mobile defaults: a mid-range phone on a slow 4G connection, simulated.

| Limit | Value | Why |
| --- | --- | --- |
| Performance score | ≥ 90 | |
| Accessibility score | ≥ 95 | A second view next to pa11y-ci. It includes the WCAG 2.2 target size of 24 × 24 px |
| Best practices score | ≥ 95 | Includes errors in the browser console, such as a resource blocked by the Content-Security-Policy |
| SEO score | ≥ 95 | |
| Largest Contentful Paint | ≤ 2.5 s | Core Web Vital, "good" |
| Cumulative Layout Shift | ≤ 0.1 | Core Web Vital, "good". The fallback font in `global.css` is sized like Inter, so text doesn't move when Inter loads |
| Total Blocking Time | ≤ 200 ms | A lab measure standing in for Interaction to Next Paint, which only real visitors can measure |
| First Contentful Paint | ≤ 1.8 s | |

These limits are the defaults of the template. A site may tighten them. Loosening one needs a reason in the site's README, the same rule as the page-weight limits ([site-settings.md](site-settings.md)).

The reports stay in the CI run. Nothing goes to Lighthouse's public storage.

## Run the accessibility check locally

```sh
pnpm test        # builds dist/
pnpm test:a11y   # pa11y-ci on every page
```

You need Chrome (or Edge) installed. The script finds it in the usual places, or you can set `CHROME_PATH`. Puppeteer doesn't download a browser.

Lighthouse doesn't run locally: `node scripts/quality.mjs lighthouse` stops with a note. To look into a Lighthouse failure on your machine, use the reports from CI (below), or Chrome DevTools → Lighthouse on `pnpm exec wrangler pages dev dist`. As a last resort, `LHCI_LOCAL=1 node scripts/quality.mjs lighthouse` runs it here, but the numbers won't match the runner's.

## Read a failure

- **In the CI log:** pa11y-ci prints each failing page with the rule, the element and the fix it suggests. Lighthouse CI prints each limit that failed, with its value.
- **On the PR:** a comment with the Lighthouse table, each score and Core Web Vital per page marked ✅ or ❌ against its limit. The job `ci / lighthouse-comment` updates the same comment on every commit, so the PR shows the latest one. It isn't a required check, and it skips PRs from forks, whose token can't write.
- **In the job summary:** a table of failing pages and the same Lighthouse table.
- **In the artifact `quality-reports`**, kept for 14 days: `pa11y.json`, plus the full Lighthouse HTML reports (`lighthouse/*.html`). Open a report in a browser to see what slowed a page down or what moved.

Lighthouse timings change a little from run to run. If a limit fails by a hair and the PR didn't touch that page, run the job again once. If it fails again, it's real.
