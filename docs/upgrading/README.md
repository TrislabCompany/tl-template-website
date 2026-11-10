# Updates from the template

This repository was made from a Trislab template. The template keeps improving: its workflows' callers, skills, docs and build files. Those improvements reach this repository only as a pull request, opened by the `update-from-template` skill, one template release at a time. Nothing changes here without a PR that a person reviews and merges.

This page is owned by the platform and is the same in every template.

## Which release this repository is on

`.template-version`, at the repository root, records it:

```yaml
template: template-website
version: v0.1.0
commit: <the full SHA of the template's tag>
```

The template's releases are tags `template-<type>/vX.Y.Z` in its repository (for example `tl-template-website`), never `v*`, which would release this app. Each release has notes in the template repository, `docs/upgrading/template-vX.Y.Z.md`: whether it is breaking, what it requires, what it changes, and the upgrade steps.

## Who owns which file

The template's `template-manifest.yaml` gives every path one ownership. An update treats each path by it:

| Ownership | For example | What an update does | You |
| --- | --- | --- | --- |
| `platform` | `.github/workflows/*`, `.github/actions/`, `renovate.json`, `CLAUDE.md`, the deploy-time scripts (`scripts/write-config.mjs`, `version.mjs`, `status.mjs`), the skills `release` and `update-from-template`, this page | Replaces the file with the template's | Don't edit it; ask the platform team for a change in the template |
| `shared` | `AGENTS.md` outside its template block, `.agents/rules/`, the rest of `docs/`, the other scripts, `public/_headers`, `astro.config.mjs`, `package.json` | Merges the template's change into your file and lists every conflict | Adapt it as you need; resolve the listed conflicts in the PR |
| `product` | `src/`, content, `README.md`, `CODEOWNERS`, `pnpm-lock.yaml` | Nothing; the template's change is shown in the PR as a suggestion | Yours |
| `template-only` | The template's release skill and notes | Never copied | — |

## Your own skills

A folder in `.agents/skills/` that the template's manifest doesn't list is a **project skill**. An update never reads, changes or deletes it. Give it `metadata.owner: project` in its front matter and list it in the "Project skills" table of `AGENTS.md`. So that Claude Code lists it, add a pointer `.claude/skills/<name>/SKILL.md` with the same front matter and one line: read `.agents/skills/<name>/SKILL.md` and follow it. The "Template skills" block of `AGENTS.md`, between `<!-- template-skills:start -->` and `<!-- template-skills:end -->`, is rewritten by every update.

When a template release adds a skill with the name of one of yours, the update stops and asks you to rename yours first.

## An update PR

- Titled `chore(template): template-<type>/vX.Y.Z`. It brings one minor version (with its patches) and bumps `.template-version`.
- Its body lists the changes by ownership, the conflicts, the suggestions for your files, and the upgrade steps done or left to you.
- `ci / ci` must pass, as on every PR. Review it like any other change; the merge deploys to dev, and the change reaches production with the next release and promotion.
- The canary repository takes each release first. Other repositories follow once the canary's update is merged and deployed.
- From roadmap phase 15, Renovate opens these PRs from `.template-version`. Until then the platform team opens them, or you run the skill: ask your coding agent to "update from the template".
