# tl-template-website

The template for content sites on the Trislab platform. Read this first; the detail is in [`docs/`](docs/).

## What it is

An [Astro](https://astro.build) site built into static files, served by Cloudflare Pages. The sample site is in English and Slovenian. It has a home page, a sample list of Markdown items with a page for each, an about page, a contact page, an imprint, a privacy policy, an accessibility statement, a sustainability page, a sitemap page, a 404 page, and a footer that shows the Environment and version it runs in on every Environment except production, read from `/config.json`. Interface-only language packs for Croatian, Italian and Serbian are included.

## When to use it

Use it for a site that shows content, such as pages, articles, a company or a documentation site, with no API, no database and no users of its own.

| Your product… | Choose |
| --- | --- |
| Shows content, with no backend of its own | `tl-template-website`, this template |
| Lets people work with data, such as forms, lists or a workflow, for one organisation, with its own API and database | `tl-template-webapp` |
| Serves many customers from one deployment, each a tenant with its own users, plans and data | `tl-template-saas` |

## How to use it

You don't create a repository from this template yourself. The platform creates it when your product is onboarded: the onboarding PR in `tl-cloud-infrastructure` adds the repository to `catalog/repos.yaml`, named `<customer>-website-<product>`, and the pipeline creates it from this template with its team, rules, Cloudflare Pages project and `dev`, `staging` and `production` Environments. Don't use GitHub's "Use this template" button.

The new repository gets a copy of these files, and records the template release it came from in `.template-version`. Later template releases reach it only as `update-from-template` PRs, which change the platform's files and merge the template's changes into the shared ones, and never touch your code, content or this README ([docs/upgrading/README.md](docs/upgrading/README.md)). From then on the code, this README and `docs/` are your team's.

## Features included

What works on the first deploy, with no change:

- The sample site, ready to replace with your own pages and content.
- Several languages, each under its own URL (`/en`, `/sl`), with `hreflang`, `x-default`, a canonical link and a language switch on every page. A one-language site has no prefix.
- Lists of items kept as Markdown (`collections` in `src/site.config.ts`): a list page, a page per item, a home page section and a menu link for each.
- A contact page, an imprint, a privacy policy, an accessibility statement and a sustainability page, filled from `src/site.config.ts` and Markdown, and linked from the footer. The legal pages show no date.
- A sitemap of every page in every language, a sitemap page for visitors, and a `robots.txt` that names the sitemap and blocks AI training crawlers.
- **Closed to search engines everywhere except a public production:** on `dev`, `staging` and an unreleased `production`, every response has `X-Robots-Tag: noindex, nofollow`, every page a robots meta tag, `robots.txt` is `Disallow: /` and there is no sitemap. No variable can open `dev` or `staging` ([docs/deployment.md](docs/deployment.md#search-engines)).
- The company as structured data (JSON-LD, `Organization` or `LocalBusiness`) on every page, Open Graph and Twitter metadata, a skip link.
- `/.well-known/security.txt`, with its expiry date checked in `ci`.
- A page-weight budget: `ci` fails when a page or its JavaScript is over the limit.
- `/config.json`, written at deploy from the `PLATFORM_*` and `PUBLIC_*` settings, so one build runs in every Environment.
- Security headers on every answer, including a strict Content-Security-Policy, and long caching of hashed assets (`public/_headers`).
- The brand in two places: `src/styles/tokens.css` and the logo (`src/components/Logo.astro`, `public/favicon.svg`).
- The check `ci / ci` on every PR and every push to `main`: the template manifest, `astro check`, the linter, the unit tests, the build, the checks on the built site (page weight, `security.txt`, the claims of the legal pages, the search-engine rule, a browser check with axe-core), accessibility (pa11y-ci) and Lighthouse CI. On a PR only the steps the changed files need run.
- Deploy to dev on every merge, *Release new version* to tag and build a version once, and *Deploy to staging* and *Promote to production* to deploy exactly that build.
- A yearly CO₂ estimate for internal ESG figures: `pnpm co2`. It is never shown on the site.

## Technologies

| Technology | Version |
| --- | --- |
| Astro | 7.3.3 |
| Node.js | 22 (build only) |
| pnpm | 10.34.9 |
| TypeScript | 5.9.3 |
| ESLint | 10.13.0, with `typescript-eslint` 8.72.1 and `eslint-plugin-astro` 3.2.1 |
| Wrangler | 4.152.0, to deploy to Cloudflare Pages and to serve `dist/` locally |
| Playwright with axe-core | 1.64.1 and 4.14.0, the browser check |
| pa11y-ci | 5.0.0, the accessibility check |
| Lighthouse CI | 0.16.0, the performance and Core Web Vitals check |
| CO2.js (`@tgwf/co2`) | 0.19.0, dev only, for `pnpm co2` |

Renovate proposes updates every Monday, and Dependabot raises security fixes as soon as they are published ([dependencies.md](docs/dependencies.md)). Every update passes the same checks as any other change ([quality-checks.md](docs/quality-checks.md)).

## Repository layout

| Path | Holds |
| --- | --- |
| `src/site.config.ts` | The site's facts: languages, company, contact, lists of items, legal pages, structured data, `security.txt` |
| `src/` | The site: `pages/[...lang]/`, `layouts/`, `components/`, `content/<collection>/<language>/`, `i18n/`, `lib/` and `styles/` |
| `public/` | Files copied as they are: the favicon and `_headers`, the security headers and caching |
| `scripts/`, `page-weight.config.json` | The checks `pnpm test` runs, the accessibility and Lighthouse checks, the page-weight limits, and the scripts the workflows use: `write-config.mjs`, `version.mjs`, `status.mjs` |
| `.github/` | The workflows (ci, deploy, release, promote), the setup action, the PR template and the code owners |
| `AGENTS.md`, `CLAUDE.md`, `.agents/skills/`, `.claude/skills/` | The guide for coding agents and their skills: `release` and `update-from-template` |
| `template-manifest.yaml` | The ownership of every path, for template updates. Only in the template |
| `docs/` | The detail behind this README |

## First steps

1. **Set the site's facts:** languages, company, contact, lists of items and legal pages in `src/site.config.ts` ([site-settings.md](docs/site-settings.md)), and the brand in `src/styles/tokens.css`.
2. **Run it locally:** `pnpm install`, then `pnpm dev`, and open <http://localhost:4321>. Run `pnpm test` and `pnpm test:a11y` before you push. [getting-started.md](docs/getting-started.md) also runs it as Cloudflare Pages serves it.
3. **Open your first PR:** change a page in `src/pages/[...lang]/`, push a branch and open a PR. `ci / ci` must pass and a code owner must approve.
4. **Deploy, release and promote:** a merge to `main` deploys to dev, *Release new version* tags a version and deploys it to staging, and *Promote to production* moves it to production after a reviewer approves. `pnpm status` shows what runs where; [deployment.md](docs/deployment.md) explains how it works. The `release` skill runs the workflows for you.

## More

- [Getting started](docs/getting-started.md): run the site with the dev server and as Cloudflare Pages serves it, and run the tests.
- [Architecture](docs/architecture.md): the build, Cloudflare Pages, the headers and the request path.
- [Site settings](docs/site-settings.md): languages, lists of items, contact and legal pages, structured data, `security.txt`, the page-weight budget, the brand and the yearly CO₂ estimate.
- [Configuration](docs/configuration.md): the settings, `/config.json`, and how to add a `PUBLIC_` setting.
- [Deployment](docs/deployment.md): Environments, deploy, release and promote, search engines, rollback, and how the site is set up and torn down.
- [Quality checks](docs/quality-checks.md): what `ci / ci` checks, what runs for a PR, accessibility and Lighthouse.
- [Dependencies](docs/dependencies.md): Renovate, Dependabot and how to add a package.
- [Updates from the template](docs/upgrading/README.md): `.template-version`, who owns which file, and update PRs.

## Maintaining the template

The template is released as `template-website/vX.Y.Z`, never `v*`. Every path has an ownership in `template-manifest.yaml`, which `pnpm test` checks. The `release-template` skill prepares a release; [docs/template-releases.md](docs/template-releases.md) has the rules and the list of releases. Both stay in the template and never reach a product repository.
