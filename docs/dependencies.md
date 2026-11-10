# Dependencies

The site's dependencies are the npm packages in `package.json` (Astro and the build and test tools), pnpm and Node, and the GitHub Actions in `.github/`. Every version is pinned exactly, and `pnpm-lock.yaml` pins everything they depend on in turn. CI installs with `pnpm install --frozen-lockfile`, so a build uses exactly what the lock file says.

Two tools keep the pins current and safe. Both work through PRs and GitHub's emails.

| Tool | When | What it does | Who is emailed |
| --- | --- | --- | --- |
| **Renovate** | Every Monday before 07:00 (Europe/Ljubljana) | Checks every dependency for a newer version. Opens a PR for each update or group of updates, and refreshes the lock file once a week. Keeps the **Dependency Dashboard** issue with everything pending | The code owners (the repository's team), as reviewers of each PR |
| **Dependabot** alerts and security updates | As soon as an advisory is published | Raises an alert in the repository's Security tab, and opens a PR with the fixed version | Repository admins and everyone watching the repository's security alerts |

Renovate is the weekly check: if a dependency needs an upgrade, a PR is waiting on Monday morning, and the team has an email about it. Dependabot is the fast path for security advisories, so Renovate doesn't open security PRs itself (`vulnerabilityAlerts` is off in `renovate.json`). That way nobody gets two PRs for the same fix.

For the emails to arrive, each person needs the right GitHub notification settings: *Settings → Notifications*, with *Email* on for *Participating* (Renovate's review requests) and for *Dependabot alerts*, and *Watch → Custom → Security alerts* set on this repository.

## Renovate settings

`renovate.json`:

- **Schedule:** weekly, Monday before 07:00. Lock-file maintenance runs on the same schedule.
- **Release age:** a new version is proposed only once it is **3 days** old. Most hijacked npm releases are caught and pulled within that time.
- **Groups:** Astro with `@astrojs/*`, the lint tools, the quality-check tools (pa11y-ci, Lighthouse CI) and the GitHub Actions each come as one PR. **Major versions** always get their own PR with the label `major`.
- **Pins:** npm versions stay exact, and Actions stay pinned to a commit SHA with the version in a comment.
- **Node** majors are off. Moving Node is a deliberate change to `.github/actions/setup` and `engines`.
- **No automerge.** Every update passes `ci / ci` (tests, accessibility and Lighthouse; see [quality-checks.md](quality-checks.md)) and a code owner's review, like any other PR.

Renovate needs the **Mend Renovate** GitHub App installed for this repository by an organization owner. Without it, nothing runs. The first run opens a Dependency Dashboard issue.

`renovate.json` is owned by the platform and the same in every website repository: a template update replaces it ([upgrading/README.md](upgrading/README.md)). Ask the platform team for a change to the rules.

## Review an update PR

1. Read the release notes Renovate links in the PR. For a `major`, read the migration guide.
2. Let `ci / ci` pass. If it fails, fix the code on the same branch, or close the PR with a reason. Renovate won't open it again for that version.
3. A code owner approves and merges it. The merge deploys to dev ([deployment.md](deployment.md)). Look at dev before you release.
4. Updates ship with the next release, made through *Release new version*, then *Deploy to staging*, then *Promote to production*. A security fix is worth a release of its own.

## Dependabot

Enable it once per repository (needs repository admin):

```sh
REPO=<org>/<repository>
gh api -X PUT "repos/$REPO/vulnerability-alerts"        # Dependabot alerts
gh api -X PUT "repos/$REPO/automated-security-fixes"    # Dependabot security updates
gh api -X PATCH "repos/$REPO" \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
gh api "repos/$REPO" --jq .security_and_analysis        # check
```

There is no `.github/dependabot.yml`. Renovate handles version updates, and Dependabot handles security only.

**When an alert arrives:**

1. Open it in the Security tab. Is the vulnerable code used by this site? It's a static site with no server code, so an advisory about SSR, server islands or the dev server is lower risk, but it still gets fixed.
2. Merge Dependabot's PR once `ci / ci` passes. If there's no PR (the fix needs a major version), take the Renovate PR for that major, or bump the version by hand in a PR.
3. Release, then deploy to staging and promote to production with the workflows.
4. Only if the fix can't ship yet: dismiss the alert with the reason, and link the issue that tracks the fix.

To check by hand at any time:

```sh
pnpm audit --prod   # what the built site is made from
pnpm outdated
```

## Add a dependency

- Prefer none. The site ships almost no JavaScript, and every package is code that has to be trusted and kept current.
- Explain in the PR why the package is needed. Use a package with active maintainers that is widely used.
- Pin it exactly (`pnpm add -E`), and don't take a release younger than 3 days.
- Install scripts stay off. pnpm runs none unless they're allowed, and `ignoredBuiltDependencies` in `package.json` lists the ones that were reviewed and are not needed.
