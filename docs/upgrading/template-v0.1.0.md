# template-website v0.1.0

The first release of the website template. Every repository made from it before this release has no `.template-version`, so its update is an untracked one (see "An untracked repository" in `.agents/skills/update-from-template/SKILL.md`).

## Breaking

Yes:

- The skills moved from `.claude/skills/` to `.agents/skills/`.
- The headings of `docs/deployment.md` lost their numbers, so their links changed (for example `#6-steps-for-developers` is now `#steps-for-developers`). The `release` skill links to the new ones.

## Requires

`app-workflows >= v0.2.0` in `.github/workflows/` (`deploy.yml` and `release.yml` call `app-deploy.yml` and `app-release.yml`, new in v0.2.0).

## Changes by ownership

Everything since the template was created: tl-template-website#4, #5, #6 and the PR of this release.

### platform

- **`.agents/skills/release/`** (moved from `.claude/skills/release/`): checks the release tag requirements before a `v*` tag (format, new, higher, bump size, on `origin/main`, images exist, released workflows, release-tier Environments, permission, annotated tag pushed alone) and links to `docs/deployment.md` by heading.
- **`.agents/skills/update-from-template/`**: new; takes the next template release as one PR.
- **`docs/upgrading/README.md`**: new; how template updates work.
- **`CLAUDE.md`**: new; only `@AGENTS.md`.
- **`scripts/check-template-manifest.mjs`** and its test: new; checks the manifest in the template, and passes at once in a product repository.
- `.github/workflows/`: `ci.yml`, `deploy.yml` and `release.yml` pinned to `app-workflows/v0.2.0`.

### shared

- **`AGENTS.md`**: new; the guide for coding agents, with the template skills block and a project skills table.
- **`docs/deployment.md`**: headings without numbers; the steps for developers point to `.agents/skills/release/SKILL.md`.
- **`package.json`**: `pnpm test` starts with `check:template`; new dev dependency `yaml` 2.9.1. Since #4 and #5: the page-weight and `security.txt` checks, `pnpm co2` and its dev dependency `@tgwf/co2`.
- **`.dockerignore`**: leaves out `.agents`, `AGENTS.md`, `CLAUDE.md`, `.template-version` and `template-manifest.yaml`.
- Since #4: languages, legal and contact pages, JSON-LD, `security.txt`, the page-weight budget (`scripts/`, `page-weight.config.json`, `docs/site-settings.md`). Since #5: the yearly CO₂ estimate (`scripts/co2-estimate.mjs`).

### product

Shown as suggestions only: the sample site in `src/` and `public/`, `README.md`, `platform.yaml`, `.trivyignore`, `pnpm-lock.yaml`.

### template-only

`template-manifest.yaml`, `.agents/skills/release-template/`, `docs/template-releases.md`, these notes.

## Upgrade steps

1. Delete `.claude/skills/release/` once `.agents/skills/release/` is copied. Move any other folder of `.claude/skills/` to `.agents/skills/` as a project skill (`metadata.owner: project`), after the team's yes, and list it in the project skills table of `AGENTS.md`.
2. Change every link to a numbered heading of `docs/deployment.md` (for example in `README.md`) to the new heading.
3. Run `pnpm install` so `pnpm-lock.yaml` gets the new dev dependencies, then `pnpm test`.
4. Write `.template-version` with `template: template-website`, `version: v0.1.0` and the tag's commit.
