---
name: release
description: Deploy, release or promote this site on Cloudflare Pages, or show which version runs in which Environment — follow a merged change to dev, run the Release new version workflow to tag and build the next vX.Y.Z and deploy it to staging, run Promote to production, explain a rollback — following docs/deployment.md. Use when the user asks to deploy, release, tag, promote, roll back, ship to production, or where a version runs.
metadata:
  owner: template-website
  ownership: platform
---

# release

Runs the steps of [docs/deployment.md](../../../docs/deployment.md) with `gh`. The workflows do the work: this skill checks the preconditions, starts them, watches them and reports. It never edits a workflow, never tags and never deploys by hand.

This file is owned by the platform and is the same in every website repository. A product repository never edits it: an `update-from-template` PR replaces it.

A release is not a tag a person pushes. It is the workflow **Release new version** (`release.yml`): started by hand from `main` with `patch`, `minor` or `major`, it picks the next `vX.Y.Z`, runs `pnpm test`, builds the site once, tags the commit with an annotated tag and publishes the GitHub Release with `site-vX.Y.Z.zip`. **Deploy to staging** then starts by itself, and **Promote to production** moves that same zip to production after a reviewer approves.

## Commands

| Command | Does |
| --- | --- |
| `release status` | Shows each Environment, the version it runs and its state: `pnpm status` ([Where the staging version is kept](../../../docs/deployment.md#where-the-staging-version-is-kept)) |
| `release deploy` | Follows a merged change to `dev`: finds the *Deploy to dev* run of the newest commit of `main`, watches it and reports ([Ship a change to dev](../../../docs/deployment.md#ship-a-change-to-dev)) |
| `release new [patch\|minor\|major]` | Checks the preconditions below, proposes the bump, and after a yes runs *Release new version* and watches it and *Deploy to staging* ([Release to staging](../../../docs/deployment.md#release-to-staging)) |
| `release promote` | Runs *Promote to production* for the version staging runs, after a yes ([Promote to production](../../../docs/deployment.md#promote-to-production)) |
| `release rollback` | Explains the rollback of production, which is a step in the Cloudflare dashboard that only a person does ([Roll back](../../../docs/deployment.md#roll-back)) |

## Steps

1. **Find the repository:** `gh repo view --json nameWithOwner,isTemplate`. If it is a template repository, stop: a template deploys nowhere, and is released with `template-<type>/vX.Y.Z` tags by its maintainers.
2. **Read the state:** `git fetch origin --tags`, then `pnpm status` (or the deployments API in the docs) for dev, staging and production.
3. **Check the preconditions** of the command, and stop with the reason when one fails:
   - `deploy`: the newest commit of `origin/main` has a *Deploy to dev* run.
   - `new`: see [Release preconditions](#release-preconditions).
   - `promote`: staging has a successful `deploy:pages` deployment, and its ref is a tag `vX.Y.Z`. That is the version that will be promoted: say it.
4. **Show what will happen** (the workflow, the version or bump, the Environments it reaches) and **ask for a yes** before `new` and `promote`. `status` and `deploy` need none.
5. **Run it:** `gh workflow run release.yml -f bump=<bump>`, or `gh workflow run promote.yml`. Never run `pages-deploy.yml`, which only the other workflows call.
6. **Watch it:** `gh run list --workflow <file> --limit 1`, then `gh run watch <run id> --exit-status`. After `new`, watch *Deploy to staging* too. *Promote to production* waits for a reviewer of the `production` Environment: say so, and that the reviewer approves it on GitHub; nobody approves their own run.
7. **Report:** the result and link of each run, the GitHub Release for a new version, and each Environment's version (`release status`). On a failure, read `gh run view <run id> --log-failed` and match it to [When a run fails](../../../docs/deployment.md#when-a-run-fails).

## Release preconditions

`release new` checks all of these before it starts the workflow, and stops with the reason when one fails:

1. **On `main`, up to date:** fetch first. The workflow releases the newest commit of `main`, so say which commit that is.
2. **Something to release:** there is a commit since the newest `vX.Y.Z` tag (`git log <tag>..origin/main`). The workflow refuses otherwise.
3. **Checked on dev:** the newest commit of `main` is what dev runs, and its *Deploy to dev* run succeeded. Warn when it is not.
4. **`ci` passed** on that commit (`gh run list --workflow ci.yml --branch main --limit 1`).
5. **The bump,** proposed from the commits since the last tag, with the reason: `major` for a change that breaks something for visitors or links, `minor` for a feature, `patch` for a fix. Under `0.x`, a breaking change is a `minor` ([Versions and release notes](../../../docs/deployment.md#versions-and-release-notes)).
6. **No other run** of *Release new version* is queued or in progress.
7. **Permission:** the person has write access; the workflow runs only for them.

## Rules

- Never create, move, delete or push a tag. Only *Release new version* creates one, and a wrong release is replaced by the next version.
- Never deploy by other means: `wrangler` from a laptop, the Cloudflare dashboard, or the portal. The one dashboard step is the production rollback in the docs, done by a person.
- Never skip the reviewers of `production` or ask anyone to.
- Never edit the workflows, `scripts/write-config.mjs` or `public/_headers` to get a deploy through.
