# tl-template-website

The template for content sites on the Trislab platform. Read this first; the detail is in [`docs/`](docs/).

## What it is

An [Astro](https://astro.build) site built into static files, served by an unprivileged nginx image on port 8080. The sample site has a home page that lists Markdown articles, one article, an about page, a 404 page, and a footer that shows the Environment it runs in, read from `/config.json`.

## When to use it

Use it for a site that shows content, such as pages, articles, a company or a documentation site, with no API, no database and no users of its own.

| Your product… | Choose |
| --- | --- |
| Shows content, with no backend of its own | `tl-template-website`, this template |
| Lets people work with data, such as forms, lists or a workflow, for one organisation, with its own API and database | `tl-template-webapp` |
| Serves many customers from one deployment, each a tenant with its own users, plans and data | `tl-template-saas` |

## How to use it

You don't create a repository from this template yourself. The platform creates it when your product is onboarded: the onboarding PR in `tl-cloud-infrastructure` adds the repository to `catalog/repos.yaml`, named `<customer>-website-<product>` (for example `trislab-website-corporate-site`), and the pipeline creates it from this template with its team, rules and `dev` Environment. Don't use GitHub's "Use this template" button.

The new repository gets a copy of these files and never syncs with the template again. From then on the code, this README and `docs/` are your team's.

## Features included

What works on the first deploy, with no change:

- The sample site, ready to replace with your own pages and content.
- `/healthz` and `/readyz`, which the platform uses to know the app is alive and ready.
- `/config.json`, written at container start from the `PLATFORM_*` and `PUBLIC_*` settings, so one image runs in every Environment.
- Security headers on every answer, including a strict Content-Security-Policy, and long caching of hashed assets.
- The check `ci / ci` on every PR and every push to `main`: it builds the image, runs `astro check` and the linter, scans the image with Trivy, and checks `platform.yaml`.
- An image that runs as a non-root user and listens only on port 8080, with every base image pinned by digest.

## Technologies

| Technology | Version |
| --- | --- |
| Astro | 5.18.2 |
| Node.js | 22.23.4 (`node:22.23.4-alpine`, build stage only) |
| pnpm | 10.34.9 |
| TypeScript | 5.9.3 |
| ESLint | 10.13.0, with `typescript-eslint` 8.72.1 and `eslint-plugin-astro` 3.2.1 |
| nginx | 1.30.6 (`nginxinc/nginx-unprivileged:1.30.6-alpine`) |
| Trivy | 0.74.0, in `ci / ci` |

Both base images are pinned by digest in `Dockerfile`. Renovate will keep the versions current; until it runs, the platform team bumps them.

## Repository layout

| Path | Holds |
| --- | --- |
| `src/` | The site: `pages/`, `layouts/`, `components/`, `content/` and `lib/config.ts` |
| `public/` | Files copied as they are: favicon, `robots.txt` |
| `Dockerfile`, `nginx/`, `docker-entrypoint.d/` | The image: the build, nginx's configuration, and the script that writes `/config.json` |
| `platform.yaml` | The image and the sizing of the app, within the stamp's caps |
| `.github/` | The `ci` workflow, the PR template and the code owners |
| `docs/` | The detail behind this README |

## First steps

1. **Run it locally:** `pnpm install`, then `pnpm dev`, and open <http://localhost:4321>. Run `pnpm test` before you push. [getting-started.md](docs/getting-started.md) also runs it as the image.
2. **Open your first PR:** change a page in `src/pages/`, push a branch and open a PR. `ci / ci` must pass and a code owner must approve.
3. **Deploy, release and promote:** a merge to `main` deploys to `dev`, a tag `vX.Y.Z` releases to the `release` tier, and a promotion moves a release to production. The platform adds these workflows to the template; [deployment.md](docs/deployment.md) explains how they work.

## More

- [Getting started](docs/getting-started.md): run the site with the dev server and as the image, and run the tests.
- [Architecture](docs/architecture.md): the image, the app, nginx and the request path.
- [Configuration](docs/configuration.md): the settings, `/config.json`, and how to add a `PUBLIC_` setting.
- [Deployment](docs/deployment.md): Environments, deploy, release and promote, `platform.yaml` and the caps, and how to ask for more.
