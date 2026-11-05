# tl-template-website

The template for content sites on the Trislab platform. Read this first; the detail is in [`docs/`](docs/).

## What it is

An [Astro](https://astro.build) site built into static files, served by an unprivileged nginx image on port 8080. The sample site is in English and Slovenian. It has a home page that lists Markdown articles, one article, an about page, a contact page, an imprint, a privacy policy, an accessibility statement, a 404 page, and a footer that shows the Environment it runs in, read from `/config.json`.

## When to use it

Use it for a site that shows content, such as pages, articles, a company or a documentation site, with no API, no database and no users of its own.

| Your product… | Choose |
| --- | --- |
| Shows content, with no backend of its own | `tl-template-website`, this template |
| Lets people work with data, such as forms, lists or a workflow, for one organisation, with its own API and database | `tl-template-webapp` |
| Serves many customers from one deployment, each a tenant with its own users, plans and data | `tl-template-saas` |

## How to use it

You don't create a repository from this template yourself. The platform creates it when your product is onboarded: the onboarding PR in `tl-cloud-infrastructure` adds the repository to `catalog/repos.yaml`, named `<customer>-website-<product>` (for example `trislab-website-corporate-site`), and the pipeline creates it from this template with its team, rules and `dev` Environment. Don't use GitHub's "Use this template" button.

The new repository gets a copy of these files, and records the template release it came from in `.template-version`. Later template releases reach it only as `update-from-template` PRs, which change the platform's files and merge the template's changes into the shared ones, and never touch your code, content or this README ([docs/upgrading/README.md](docs/upgrading/README.md)). From then on the code, this README and `docs/` are your team's.

## Features included

What works on the first deploy, with no change:

- The sample site, ready to replace with your own pages and content.
- Several languages, each under its own URL (`/en/`, `/sl/`), with `hreflang`, `x-default`, a canonical link and a language switch on every page. A one-language site has no prefix.
- A contact page, an imprint, a privacy policy and an accessibility statement, filled from `src/site.config.ts` and Markdown, and linked from the footer.
- A sitemap of every page in every language, and a `robots.txt` that names it.
- The company as structured data (JSON-LD, `Organization` or `LocalBusiness`) on every page.
- `/.well-known/security.txt`, with its expiry date checked in `ci`.
- A page-weight budget: `ci` fails when a page or its JavaScript is over the limit.
- A yearly CO₂ estimate for internal ESG figures: `pnpm co2` turns the average page weight and the yearly visits into kg CO₂e. It is never shown on the site.
- `/healthz` and `/readyz`, which the platform uses to know the app is alive and ready.
- `/config.json`, written at container start from the `PLATFORM_*` and `PUBLIC_*` settings, so one image runs in every Environment.
- Security headers on every answer, including a strict Content-Security-Policy, and long caching of hashed assets.
- The check `ci / ci` on every PR and every push to `main`: it builds the image, runs `astro check`, the linter, the unit tests, the page-weight and `security.txt` checks, scans the image with Trivy, and checks `platform.yaml`.
- An image that runs as a non-root user and listens only on port 8080, with every base image pinned by digest.

## Technologies

| Technology | Version |
| --- | --- |
| Astro | 5.18.2 |
| Node.js | 22.23.4 (`node:22.23.4-alpine`, build stage only) |
| pnpm | 10.34.9 |
| TypeScript | 5.9.3 |
| ESLint | 10.13.0, with `typescript-eslint` 8.72.1 and `eslint-plugin-astro` 3.2.1 |
| CO2.js (`@tgwf/co2`) | 0.19.0, dev only, for `pnpm co2` |
| nginx | 1.30.6 (`nginxinc/nginx-unprivileged:1.30.6-alpine`) |
| Trivy | 0.74.0, in `ci / ci` |

Both base images are pinned by digest in `Dockerfile`. Renovate will keep the versions current; until it runs, the platform team bumps them.

## Repository layout

| Path | Holds |
| --- | --- |
| `src/site.config.ts` | The site's facts: languages, company, contact, legal pages, structured data, `security.txt` |
| `src/` | The site: `pages/[...lang]/`, `layouts/`, `components/`, `content/<collection>/<language>/`, `i18n/` and `lib/` |
| `public/` | Files copied as they are: the favicon |
| `scripts/`, `page-weight.config.json` | The checks `pnpm test` runs on the built site, the page-weight limits, and the yearly CO₂ estimate (`pnpm co2`) |
| `docs/co2/` | The yearly CO₂ notes, one file per year |
| `Dockerfile`, `nginx/`, `docker-entrypoint.d/` | The image: the build, nginx's configuration, and the script that writes `/config.json` |
| `platform.yaml` | The image and the sizing of the app, within the stamp's caps |
| `.github/` | The `ci`, `deploy` and `release` workflows, the PR template and the code owners |
| `AGENTS.md`, `CLAUDE.md`, `.agents/skills/` | The guide for coding agents and their skills: `release` and `update-from-template` |
| `template-manifest.yaml` | The ownership of every path, for template updates. Only in the template |
| `docs/` | The detail behind this README |

## First steps

1. **Set the site's facts:** languages, company, contact and legal pages in `src/site.config.ts` ([site-settings.md](docs/site-settings.md)).
2. **Run it locally:** `pnpm install`, then `pnpm dev`, and open <http://localhost:4321>. Run `pnpm test` before you push. [getting-started.md](docs/getting-started.md) also runs it as the image.
3. **Open your first PR:** change a page in `src/pages/[...lang]/`, push a branch and open a PR. `ci / ci` must pass and a code owner must approve.
4. **Deploy, release and promote:** a merge to `main` deploys to `dev`, a tag `vX.Y.Z` releases to the `release` tier, and a promotion moves a release to production. `deploy.yml` and `release.yml` do the first two, and the platform adds `promote.yml` before the first production Environment; [deployment.md](docs/deployment.md) explains how they work, and [its steps for developers](docs/deployment.md#steps-for-developers) lists your steps. The `release` skill runs them: ask the agent for `release deploy`, `release tag` or `release status` ([Release with the agent](docs/deployment.md#release-with-the-agent)).

## More

- [Getting started](docs/getting-started.md): run the site with the dev server and as the image, and run the tests.
- [Architecture](docs/architecture.md): the image, the app, nginx and the request path.
- [Site settings](docs/site-settings.md): languages, contact and legal pages, structured data, `security.txt`, the page-weight budget and the yearly CO₂ estimate.
- [Configuration](docs/configuration.md): the settings, `/config.json`, and how to add a `PUBLIC_` setting.
- [Deployment](docs/deployment.md): Environments, deploy, release and promote, `platform.yaml` and the caps, and how to ask for more, then the steps for developers.
- [Updates from the template](docs/upgrading/README.md): `.template-version`, who owns which file, and update PRs.

## Maintaining the template

The template is released as `template-website/vX.Y.Z`, never `v*`. Every path has an ownership in `template-manifest.yaml`, which `pnpm test` checks. The `release-template` skill prepares a release; [docs/template-releases.md](docs/template-releases.md) has the rules and the list of releases. Both stay in the template and never reach a product repository.
