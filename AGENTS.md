# This repository

> A content site on the Trislab platform: an Astro site built into static files and served by an unprivileged nginx image on port 8080. Start with [README.md](README.md); the detail is in [docs/](docs/).

This file is the guide for every AI coding tool (Claude Code, Cursor, Codex, …). `CLAUDE.md` only imports it: edit conventions here.

## Repository map

| Path | What |
| --- | --- |
| `src/site.config.ts` | The site's facts: languages, company, contact, legal pages, structured data, `security.txt` ([docs/site-settings.md](docs/site-settings.md)) |
| `src/` | The site: `pages/[...lang]/`, `layouts/`, `components/`, `content/<collection>/<language>/`, `i18n/`, `lib/` |
| `scripts/`, `page-weight.config.json` | The checks `pnpm test` runs, the page-weight limits, the yearly CO₂ estimate |
| `Dockerfile`, `nginx/`, `docker-entrypoint.d/` | The image, nginx's configuration, and the script that writes `/config.json` |
| `platform.yaml` | The image and the sizing of the app, within the stamp's caps ([docs/deployment.md](docs/deployment.md#platformyaml-and-the-caps)) |
| `.github/workflows/` | Thin callers of the platform's reusable workflows |
| `.agents/skills/` | The skills below; the only place skills are written |
| `.claude/skills/` | One pointer per skill, with the same front matter, so that Claude Code lists it |
| `.template-version` | The template release this repository was last updated to ([docs/upgrading/README.md](docs/upgrading/README.md)) |

## Rules

- **Run `pnpm test` before every push.** It is what the required check `ci / ci` runs.
- **Every change is a PR** to `main`, merged after `ci / ci` passes and a code owner approves. A tag goes only on a commit that a merged PR created.
- **Don't edit the platform's files:** the workflows in `.github/workflows/` (only the test command in `ci.yml` is yours), `platform.schema.json`, `renovate.json`, `docker-entrypoint.d/`, `CLAUDE.md` and the template skills. An `update-from-template` PR replaces them; ask the platform team for a change.
- **`platform.yaml` stays within the stamp's caps.** More needs a stamp change ([docs/deployment.md](docs/deployment.md#asking-for-more)).
- **No secrets** in the repository, the image or `/config.json`. Settings come from the platform as `PLATFORM_*` and `PUBLIC_*` ([docs/configuration.md](docs/configuration.md)).
- **The repository is public.** No personal data, client contracts, prices or internal addresses in code, docs, PRs or commits.
- **Deploy and release with the `release` skill** ([docs/deployment.md](docs/deployment.md#release-with-the-agent)): `dev` runs the newest `main`, and the `release` tier runs tags. Never deploy by hand (`az`, the portal).

## Skills

Skills live only in `.agents/skills/<name>/SKILL.md`. When a task matches a skill, read that file and follow it. Claude Code finds skills only in `.claude/skills/`, so each skill also has a pointer `.claude/skills/<name>/SKILL.md`: the same front matter, and a body that sends the agent to the real file. Add one with every new skill; `pnpm test` fails without it.

### Template skills

Owned by the template. Every `update-from-template` PR rewrites this block; don't edit it.

<!-- template-skills:start -->
| Skill | Use when |
| --- | --- |
| [`release`](.agents/skills/release/SKILL.md) | Deploying, tagging a release `vX.Y.Z`, promoting or rolling back, or asking which version runs where |
| [`update-from-template`](.agents/skills/update-from-template/SKILL.md) | Taking the next template release into this repository, as one PR |
<!-- template-skills:end -->

### Project skills

This repository's own skills. An update never reads, changes or deletes them. A project skill's front matter carries `metadata.owner: project`, and its name must not be one a template skill uses.

| Skill | Use when |
| --- | --- |
| — | None yet |
