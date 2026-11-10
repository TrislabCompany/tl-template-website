# This repository

> A content site: an Astro site built into static files and served by Cloudflare Pages. Start with [README.md](README.md); the detail is in [docs/](docs/).

This file is the guide for every AI coding tool (Claude Code, Cursor, Codex, …). `CLAUDE.md` only imports it: edit conventions here.

## Repository map

| Path | What |
| --- | --- |
| `src/site.config.ts` | The site's facts: languages, company, contact, lists of items, legal pages, structured data, `security.txt` ([docs/site-settings.md](docs/site-settings.md)) |
| `src/` | The site: `pages/[...lang]/`, `layouts/`, `components/`, `content/<collection>/<language>/`, `i18n/`, `lib/`, `styles/` (`tokens.css` is the brand) |
| `public/_headers` | The security headers and caching Cloudflare Pages sends ([docs/architecture.md](docs/architecture.md)) |
| `scripts/` | The checks `pnpm test` runs, the accessibility and Lighthouse checks (`quality.mjs`), the deploy-time settings and search-engine rule (`write-config.mjs`), the release versions (`version.mjs`), `pnpm status`, the yearly CO₂ estimate |
| `.github/workflows/` | ci, Deploy to dev, Release new version, Deploy to staging, Promote to production ([docs/deployment.md](docs/deployment.md)) |
| `.agents/skills/` | The skills below; the only place skills are written |
| `.claude/skills/` | One pointer per skill, with the same front matter, so that Claude Code lists it |
| `.template-version` | The template release this repository was last updated to ([docs/upgrading/README.md](docs/upgrading/README.md)) |

## Rules

- **Run `pnpm test` and `pnpm test:a11y` before every push.** The required check `ci / ci` runs them, then Lighthouse CI, which runs on GitHub only ([docs/quality-checks.md](docs/quality-checks.md)). `pnpm test` needs Chromium once: `pnpm exec playwright install chromium`.
- **Dependencies stay pinned and current** ([docs/dependencies.md](docs/dependencies.md)). Renovate proposes updates weekly and Dependabot raises security fixes. Add a package only with a reason in the PR, pin it exactly, and never take a release younger than 3 days.
- **Every change is a PR** to `main`, merged after `ci / ci` passes and a code owner approves. Every merge deploys to dev.
- **Release, deploy and promote only with the workflows** ([docs/deployment.md](docs/deployment.md)): *Release new version*, *Deploy to staging*, *Promote to production*. Never tag by hand, never move or delete a tag, never deploy with `wrangler` from a laptop or through the Cloudflare dashboard.
- **Only a public production is indexable** ([docs/deployment.md](docs/deployment.md#search-engines)). Never change `scripts/write-config.mjs` or its tests to open dev or staging.
- **Don't edit the platform's files:** the workflows in `.github/workflows/` and `.github/actions/`, `renovate.json`, `CLAUDE.md`, `scripts/write-config.mjs`, `version.mjs`, `status.mjs`, the manifest check and the template skills. An `update-from-template` PR replaces them; ask the platform team for a change.
- **No secrets** in the repository, the build or `/config.json`. The Cloudflare token lives only in the GitHub Environments. Settings reach the site only as `PLATFORM_*` and `PUBLIC_*` ([docs/configuration.md](docs/configuration.md)).
- **Hostnames, DNS, Access and the Pages project** belong to the infrastructure repository, not to this repository ([docs/deployment.md](docs/deployment.md#set-up-and-tear-down)).
- **The repository is public.** No personal data, client contracts, prices or internal addresses in code, docs, PRs or commits.

## Skills

Skills live only in `.agents/skills/<name>/SKILL.md`. When a task matches a skill, read that file and follow it. Claude Code finds skills only in `.claude/skills/`, so each skill also has a pointer `.claude/skills/<name>/SKILL.md`: the same front matter, and a body that sends the agent to the real file. Add one with every new skill; `pnpm test` fails without it.

### Template skills

Owned by the template. Every `update-from-template` PR rewrites this block; don't edit it.

<!-- template-skills:start -->
| Skill | Use when |
| --- | --- |
| [`release`](.agents/skills/release/SKILL.md) | Deploying, releasing a new version, promoting to production, or asking which version runs where |
| [`update-from-template`](.agents/skills/update-from-template/SKILL.md) | Taking the next template release into this repository, as one PR |
<!-- template-skills:end -->

### Project skills

This repository's own skills. An update never reads, changes or deletes them. A project skill's front matter carries `metadata.owner: project`, and its name must not be one a template skill uses.

| Skill | Use when |
| --- | --- |
| — | None yet |
