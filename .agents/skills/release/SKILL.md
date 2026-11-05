---
name: release
description: Deploy, release, promote or roll back this app, or show which version runs in which Environment — ship a merged change to dev, tag vX.Y.Z for the release tier after checking every release tag requirement, promote a version to prod, roll back to the previous version — following the steps for developers in docs/deployment.md. Use when the user asks to deploy, release, tag, promote, roll back, ship to production, or where a version runs.
metadata:
  owner: template-website
  ownership: platform
---

# release

Runs the [steps for developers](../../../docs/deployment.md#steps-for-developers) with `gh` and `git`. The workflows do the work; this skill checks the preconditions, starts them, watches them and reports. It never edits the workflows or `platform.yaml`.

This file is owned by the platform and is the same in every template. A product repository never edits it: an `update-from-template` PR replaces it.

## Commands

| Command | Does |
| --- | --- |
| `release status` | Lists the Environments and the version each runs, from the GitHub deployments ([What runs where](../../../docs/deployment.md#what-runs-where)) |
| `release deploy` | Follows a merged change to `dev`: finds the `deploy.yml` run of the latest commit on `main`, watches it, reports the result ([Ship a change to `dev`](../../../docs/deployment.md#ship-a-change-to-dev)) |
| `release tag [version]` | Checks the release tag requirements below, tags a commit of `main` and watches `release.yml` ([Release to `test` or `staging`](../../../docs/deployment.md#release-to-test-or-staging)) |
| `release promote <version> [environment]` | Runs `promote.yml`, by default to `prod` ([Promote to `prod`](../../../docs/deployment.md#promote-to-prod)) |
| `release rollback [environment]` | Promotes the version that ran before the current one ([Roll back](../../../docs/deployment.md#roll-back)) |

## Steps

1. **Find the repository:** `gh repo view --json nameWithOwner,isTemplate`. If it is a template repository, stop: a template deploys nowhere, and is released with `template-<type>/vX.Y.Z` tags by its maintainers, never `v*`.
2. **Read the state:** `git fetch origin --tags`, the Environments (`gh api repos/<repo>/environments --jq '.environments[].name'`) and the latest deployment of each (`gh api "repos/<repo>/deployments?environment=<name>&per_page=1"`).
3. **Check the preconditions** of the command, and stop with the reason when one fails:
   - `deploy`: the latest commit on `origin/main` has a `deploy.yml` run.
   - `tag`: every [release tag requirement](#release-tag-requirements).
   - `promote`: `.github/workflows/promote.yml` exists, the target Environment exists, the version is not a release candidate when the target is `prod`, and the version is the latest deployment of a `release` tier Environment (`test`, `staging`, `uat`, `perf`, `demo`, or their `<customer>-` forms).
   - `rollback`: the previous version is the one deployed in the target Environment before the current one.
4. **Show what will happen** (the command, the commit or version, the Environments it reaches) and **ask for a yes** before every tag, promotion and rollback. `status` and `deploy` need none.
5. **Run it:** for a tag, the commands in requirement 13; for a promotion, `gh workflow run promote.yml -f version=<version> -f environment=<environment>`.
6. **Watch the run:** for a tag, only the `release.yml` run of that tag (`gh run list --workflow release.yml --branch <version> --limit 1`); otherwise `gh run list --workflow <file> --limit 1`. Then `gh run watch <run id> --exit-status`. A promotion to `prod` waits for a reviewer: say so, and that the reviewer approves it on GitHub.
7. **Report:** the run's result and link, the GitHub Release for a tag, and each Environment's new version (`release status`). On a failure, read `gh run view <run id> --log-failed` and match it to [When a run fails](../../../docs/deployment.md#when-a-run-fails).

## Release tag requirements

`release tag` checks all of these before it creates a tag, and stops with the reason when one fails.

1. **Format:** the version matches `^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-rc\.[1-9]\d*)?$`.
2. **New:** it is in neither `git tag -l` nor `git ls-remote --tags origin`, and was never used before, a deleted release candidate included (check the GitHub Releases and the `release.yml` runs).
3. **Higher** than every `v*` tag by semantic version order. A release candidate only for a version not released yet, and its number one higher than the last rc of that version, starting at `-rc.1`.
4. **Bump size:** without a version, propose one from the commits since the last tag, with the reason:
   - major for a breaking change: the HTTP API, events, a database contract step, settings, or the caps in `platform.yaml`;
   - minor for a feature;
   - patch for a fix.

   Under `0.x`, a breaking change is a minor bump.
5. **On `origin/main`:** fetch first, then `git merge-base --is-ancestor <sha> origin/main`. Tag the full SHA, never local `HEAD`.
6. **Its images exist:** a `deploy.yml` run for that exact SHA that succeeded (a cancelled run doesn't count), and the tag `sha-<first 7 characters>` exists in GHCR for every image in `platform.yaml`. When several merges land during a deploy, only the newest waits, so an earlier commit may have no images.
7. **A warning** when the commit is not the version running in `dev`.
8. **Not a template repository** (step 1).
9. **Released workflows:** `release.yml` pins a released `app-workflows/vX.Y.Z` tag, not an rc. The canary repository, while it tests an rc, is the only exception.
10. **Release-tier Environments:** list them and which have a deploy identity (the Environment variable `AZURE_CLIENT_ID`). When there is none, say that the tag only creates the GitHub Release.
11. **No other `release.yml` run** is queued or in progress.
12. **Permission:** the person may create `v*` tags (from roadmap phase 10, only `devops` and the team's maintainers), and pushes with their own credentials, never with a workflow's `GITHUB_TOKEN`.
13. **An annotated tag,** signed when a ruleset requires it, and only that tag pushed:

    ```bash
    git tag -a <version> <full sha> -m "<version>"
    git push origin refs/tags/<version>
    ```

    Never `git push --tags` or `--follow-tags`.
14. **A yes:** show the version, the SHA, the changes since the last tag and the target Environments, and ask.
15. **Migrations:** when the repository has database migrations, say whether the range adds any, and that a rollback never reverses them.
16. **After the push:** watch that tag's `release.yml` run only, and report the Release and the Environments. A failure is fixed by the next version or rc, never by a moved tag.

## Rules

- Never move, delete or push again a tag that exists. A wrong release is replaced by the next version.
- Never run `deploy.yml` or `release.yml` in a way the docs don't describe, and never deploy by other means (`az`, the portal).
- Never skip an Environment's reviewers or ask anyone to.
