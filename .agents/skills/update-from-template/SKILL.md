---
name: update-from-template
description: Take the next release of this repository's template (the next minor version after .template-version, with its patches) into the repository as one PR — fetch the template's tags, apply the difference between the two releases path by path by the ownership in template-manifest.yaml (platform copied, shared 3-way merged, product left as suggestions, template-only skipped, project skills never touched), rewrite the template skills block of AGENTS.md, do the release notes' upgrade steps, run the checks, bump .template-version and open the PR. Use when the user asks to update from the template, take a template release, sync with the template, or when a template update PR is due.
metadata:
  owner: template-website
  ownership: platform
---

# update-from-template

Brings one template release into this repository. The repository shares no git history with its template, so this is never a `git merge`: it applies the difference between two template tags, path by path, by the ownership the template's `template-manifest.yaml` gives each path. How it works for the team is in [docs/upgrading/README.md](../../../docs/upgrading/README.md).

This file is owned by the platform and is the same in every template. A product repository never edits it: the update replaces it.

## Terms

- **`.template-version`** at the repository root:

  ```yaml
  template: template-website        # template-website, template-webapp or template-saas
  version: v0.1.0                   # the release this repository was last updated to
  commit: <full sha of that tag's commit>
  ```

- **The template repository** is `TrislabCompany/tl-<template>`, e.g. `tl-template-website`. Its releases are tags `<template>/vX.Y.Z`.
- **Base** is the release in `.template-version`; **target** is the release this update brings.

## Steps

1. **Start clean.** The working tree is clean; fetch, and branch from an up-to-date `main`: `template-<template>-v<x.y.z>`.
2. **Read `.template-version`.** When it is missing, the repository is **untracked**: ask which template it came from (the `template` of its entry in `catalog/repos.yaml` of `tl-cloud-infrastructure`), and follow [An untracked repository](#an-untracked-repository).
3. **Fetch the template's tags** into their own namespace, never into `refs/tags`:

   ```bash
   git fetch --no-tags https://github.com/TrislabCompany/tl-<template>.git "refs/tags/<template>/*:refs/template/<template>/*"
   ```

4. **Choose the target:** the next minor version after the base (`v0.1.x` → the highest `v0.2.*`), never more than one minor per PR. Within the same minor, the highest patch. When there is none, stop: the repository is up to date.
5. **Read the notes** of every release after the base up to the target: `git show refs/template/<template>/<target>:docs/upgrading/template-<version>.md`. Collect **Requires**, **Breaking** and **Upgrade steps**. When a requirement is not met here (for example a variable or secret in the GitHub Environments that the notes name), stop and say what the team or the platform team must set up first.
6. **Read both manifests:** `template-manifest.yaml` at the base and at the target. A path's ownership is the first rule that matches it in the target's manifest; for a path the target deletes, in the base's.
7. **Check skill names.** A skill folder in `.agents/skills/` that is not in the base manifest's `skills` is a project skill. When the target's `skills` adds a name that a project skill uses, stop and ask the team to rename theirs first. Never read, change or delete a project skill, or its pointer `.claude/skills/<name>/`.
8. **List the changed paths:** `git diff --name-status --no-renames refs/template/<template>/<base> refs/template/<template>/<target>`. Apply each by its ownership:

   | Ownership | Added or changed in the template | Deleted in the template |
   | --- | --- | --- |
   | `platform` | `git checkout refs/template/<template>/<target> -- <path>`: the template's file replaces this one | Delete it |
   | `shared` | `git diff --binary <base tag> <target tag> -- <path> \| git apply --3way`; a new file is added. List every conflict, with the file and both sides | Delete it when it is unchanged from the base; otherwise keep it and list it |
   | `product` | Leave it. Add the template's diff to the PR body under **Suggestions** | Leave it, and mention it |
   | `template-only` | Skip it | Skip it; delete it if a copy exists here |

9. **Rewrite the template block of `AGENTS.md`:** replace everything between `<!-- template-skills:start -->` and `<!-- template-skills:end -->` with the target's block. Leave the project skills table alone.
10. **Do the upgrade steps** from the notes, in order.
11. **Run the checks** that `ci / ci` runs: `pnpm install --frozen-lockfile`, `pnpm exec playwright install chromium`, `pnpm test` and `pnpm test:a11y` (Lighthouse runs on GitHub only). When a `shared` change to `package.json` changed dependencies, run the package manager's install first so the lockfile follows. Fix what the update broke; a conflict you can't resolve stays listed for the team.
12. **Bump `.template-version`** to the target: its `version`, and `commit` = `git rev-parse refs/template/<template>/<target>^{commit}`.
13. **Commit and open the PR** titled `chore(template): <template>/<target>`. The body has: the releases it brings and their notes' links; **Breaking**; the changes by ownership; **Conflicts** (file by file, or "none"); **Suggestions** for `product` paths; the upgrade steps done and any left to the team; and the check results. A person reviews and merges it. When more releases are waiting, say that the next update follows this merge.

## An untracked repository

A repository created before `.template-version` existed has no base. Its first update goes to the first release of its template, usually `v0.1.0`, as in the steps above, except:

- **`platform`** paths are copied from the target as usual.
- **`shared`** paths have no base to merge from. Compare this repository's file with the target's (`git diff --no-index`, or `git diff HEAD refs/template/<template>/<target> -- <path>`). Take the template's change where this repository never changed the file, keep the repository's change where it is clearly its own, and list each file and what was taken in the PR body.
- **`product`** paths are left alone.
- **Template skills found in an old location** (a full skill in `.claude/skills/<name>/`, not a pointer) are replaced by the template's pointer once the same skill is copied to `.agents/skills/<name>/`. Any other full skill there is moved to `.agents/skills/` as a project skill, with `metadata.owner: project`, after a yes, and gets a pointer in its place.
- `.template-version` is written for the first time.

## Rules

- One template minor per PR, the canary repository first (for the website template, `trislab-website-corporate-site`).
- Never `git merge` the template, and never fetch its tags into `refs/tags`.
- Never touch `product` paths or project skills. Never merge or approve the PR.
- When the target replaces this skill, finish the update with the version you started with, and say so in the PR.
