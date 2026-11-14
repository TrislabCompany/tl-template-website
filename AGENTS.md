# This repository

> A content site: an Astro site built into static files and served by Cloudflare Pages. Start with [README.md](README.md); the detail is in [docs/](docs/).

This file is the guide for every AI coding tool (Claude Code, Cursor, Codex, …). `CLAUDE.md` only imports it: edit conventions here.

## Repository map

| Path | What |
| --- | --- |
| `src/site.config.ts` | The site's facts: languages, company, contact, lists of items, legal pages, structured data, `security.txt` ([docs/site-settings.md](docs/site-settings.md)) |
| `src/` | The site: `pages/[...lang]/`, `layouts/`, `components/`, `content/<collection>/<language>/`, `i18n/`, `lib/`, `styles/` (`tokens.css` is the brand) |
| `src/components/seo/` | The search tags of every page, the share image, the search fields of an item and the sitemap's finishing touches; `shared` with the template ([docs/search-engines.md](docs/search-engines.md)) |
| `src/components/analytics/` | Cookieless visit counts with Plausible or Cloudflare Web Analytics, rendered only when `analytics` is set; `shared` with the template ([docs/analytics.md](docs/analytics.md)) |
| `src/components/forms/` | The Turnstile challenge for a form, rendered only with a site key; `shared` with the template ([docs/forms.md](docs/forms.md)) |
| `public/_headers` | The security headers and caching Cloudflare Pages sends ([docs/architecture.md](docs/architecture.md)) |
| `scripts/` | The checks `pnpm test` runs, the accessibility and Lighthouse checks (`quality.mjs`), the deploy-time settings (`write-config.mjs`), the release versions (`version.mjs`), `pnpm status`, the yearly CO₂ estimate |
| `.github/workflows/` | ci, Deploy to dev, Release new version, Deploy to staging, Promote to production ([docs/deployment.md](docs/deployment.md)) |
| `.agents/skills/` | The skills below; the only place skills are written |
| `.claude/rules/` | The coding rules, loaded by path (below); `shared` with the template |
| `.claude/skills/` | One pointer per skill, with the same front matter, so that Claude Code lists it |
| `.template-version` | The template release this repository was last updated to ([docs/upgrading/README.md](docs/upgrading/README.md)) |

## Rules

- **Run `pnpm test` and `pnpm test:a11y` before every push.** The required check `ci / ci` runs them, then Lighthouse CI, which runs on GitHub only ([docs/quality-checks.md](docs/quality-checks.md)). `pnpm test` needs Chromium once: `pnpm exec playwright install chromium`.
- **Dependencies stay pinned and current** ([docs/dependencies.md](docs/dependencies.md)). Renovate proposes updates weekly and Dependabot raises security fixes. Add a package only with a reason in the PR, pin it exactly, and never take a release younger than 3 days.
- **Release, deploy and promote only with the workflows** ([docs/deployment.md](docs/deployment.md)): *Release new version*, *Deploy to staging*, *Promote to production*. Never tag by hand, never move or delete a tag, never deploy with `wrangler` from a laptop or through the Cloudflare dashboard.
- **Don't edit the platform's files:** the workflows in `.github/workflows/` and `.github/actions/`, `renovate.json`, `CLAUDE.md`, `.claude/settings.json`, `scripts/write-config.mjs`, `version.mjs`, `status.mjs`, the manifest check and the template skills. An `update-from-template` PR replaces them; ask the platform team for a change.
- **No secrets** in the repository, the build or `/config.json`. The Cloudflare token lives only in the GitHub Environments. Settings reach the site only as `PLATFORM_*` and `PUBLIC_*` ([docs/configuration.md](docs/configuration.md)).
- **Hostnames, DNS, Access and the Pages project** belong to the infrastructure repository, not to this repository ([docs/deployment.md](docs/deployment.md#set-up-and-tear-down)).
- **The repository is public.** No personal data, client contracts, prices or internal addresses in code, docs, PRs or commits.
- **No AI attribution.** No `Co-Authored-By:` trailer and no "generated with" line in a commit, PR or comment. Commit with your Trislab account.
- **`.claude/settings.json` enforces the rules above**: it denies `wrangler` deploys, creating, deleting or pushing tags by hand, and reading `.env` files, and asks before an edit of the workflows. It is a platform file; put personal settings in `.claude/settings.local.json`.

## Coding rules

The rules for writing code are in `.claude/rules/`. Each has `paths:` front matter, so Claude Code loads it when you touch a matching file; other tools: read the rule before working in that area. Each rule says which check enforces it; the prose is what review has to catch. They are `shared` with the template: adapt one for this site, and the next update merges the template's changes in.

| Working on… | Read |
| --- | --- |
| Pages, components, styles, i18n, browser scripts, errors | `coding.md` |
| Content, its schemas and `src/site.config.ts` | `content.md` |
| The scripts and checks in `scripts/` | `scripts.md` |
| Tests, budgets and what each check proves | `testing.md` |

## Git and review

- Branch from `main` with a short kebab-case topic (`news-collection`). One change per PR; a workflow change goes in its own PR.
- The PR title is an imperative plain sentence of 72 characters or fewer; it becomes the squash commit. A template update is titled `chore(template): template-<type>/vX.Y.Z`. Answer the PR template's checklist.
- A PR merges with `ci / ci` green and one code owner's approval, never your own. The author resolves the threads. Every merge deploys to dev.
- A review checks: the page in every language, the content's sources, a check for each new promise, the pins, docs updated, no secrets.

## Docs and tooling

- `README.md` says what the site is; `docs/` how it works; `.claude/rules/` how code is written here. A change isn't done until they match it.
- Node, pnpm and every package are pinned (`engines`, `packageManager`, exact versions; `check:template` fails on a range).

## Skills

Skills live only in `.agents/skills/<name>/SKILL.md`. When a task matches a skill, read that file and follow it. Claude Code finds skills only in `.claude/skills/`, so each skill also has a pointer `.claude/skills/<name>/SKILL.md`: the same front matter, and a body that sends the agent to the real file. Add one with every new skill; `pnpm test` fails without it.

A skill command or parameter (such as `release-template prepare`) is described in `docs/` too: what you type, what it checks, what it changes and whether it asks first. `SKILL.md` alone is not enough; change the docs in the same PR as the command.

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
