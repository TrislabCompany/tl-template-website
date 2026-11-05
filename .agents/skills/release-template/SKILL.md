---
name: release-template
description: Prepare a release of this template — choose the next template-<type>/vX.Y.Z version from the merged changes and the breaking rules, write the release notes docs/upgrading/template-vX.Y.Z.md (changes by ownership, upgrade steps, requires, breaking) and their row in docs/template-releases.md, run the checks and open the release PR; after the merge, check the commit and hand the tag command to an organization owner, then point to the canary's update. Only in the template repository itself. Use when a maintainer asks to release, version or tag the template.
metadata:
  owner: template-website
  ownership: template-only
---

# release-template

Prepares one release of this template. Only in the template repository: this skill is `template-only` and never reaches a product repository. How template releases work is in [docs/template-releases.md](../../../docs/template-releases.md).

## Commands

| Command | Does |
| --- | --- |
| `release-template status` | The last `template-<type>/v*` tag and the merged changes since then, by ownership |
| `release-template prepare` | Proposes the version and opens the release PR |
| `release-template tag` | After the merge: checks the commit and prints the tag command for an organization owner |

## prepare

1. **Start clean:** fetch with tags, branch from an up-to-date `main`. Read `template` in `template-manifest.yaml`; the tags are `<template>/vX.Y.Z`.
2. **List the changes** since the last tag: `git diff --name-status <last tag> origin/main`, each path with its ownership from the manifest, and the merged PRs (`git log --first-parent <last tag>..origin/main`). With no tag yet, everything is new. When nothing changed outside `template-only` paths, stop.
3. **Decide breaking.** A release is breaking when it:
   - removes or renames a path that products use;
   - changes a `docs/` heading a skill links to;
   - renames a skill or one of its commands, or adds a skill name;
   - adds a required variable, secret or `platform.yaml` field;
   - needs a newer `app-workflows` major version.
4. **Propose the version** with the reason: major when breaking, minor for a feature, patch for a fix. Under `0.x`, breaking is a minor. Check it is new (`git tag -l`, `git ls-remote --tags origin`) and higher than every tag of the template. Ask the maintainer to confirm.
5. **Write the notes** `docs/upgrading/template-vX.Y.Z.md`, with these headings:
   - **Breaking:** yes or no, and why;
   - **Requires:** e.g. `app-workflows >= v0.3.0`, or "nothing new";
   - **Changes by ownership:** `platform`, `shared`, `product`, `template-only`, each with what changed and the PR;
   - **Upgrade steps:** what `update-from-template` or the team does by hand, in order, or "none".
6. **Add the release** to the table in [docs/template-releases.md](../../../docs/template-releases.md#releases).
7. **Run the checks:** `pnpm test`, which includes the manifest check. Fix every failure.
8. **Open the PR** titled `<template> vX.Y.Z`, with the notes as its body.

## tag

1. The release PR is merged. Take its merge commit on `origin/main` (full SHA), and check its `ci / ci` passed and the tag does not exist.
2. Print the commands for an organization owner, an annotated tag pushed alone:

   ```bash
   git tag -a <template>/vX.Y.Z <sha> -m "<template> vX.Y.Z"
   git push origin refs/tags/<template>/vX.Y.Z
   ```

   Never a `v*` tag, which would start `release.yml` in a product repository; never `--tags` or `--follow-tags`.
3. Once tagged, the canary takes it first: suggest `update-from-template` in `trislab-website-corporate-site` for the website template, or the first `active` repository of this template in `catalog/repos.yaml` of `tl-cloud-infrastructure` for the others. The other repositories follow once the canary's update is merged and deployed.

## Rules

- Never create, move or delete a tag yourself. A tag is never moved or deleted; a fix is the next version.
- Never merge or approve a PR.
