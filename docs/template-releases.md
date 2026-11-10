# Template releases

For the template's maintainers. This page is `template-only`: product repositories never get it. How a product repository takes a release is in [upgrading/README.md](upgrading/README.md).

## Ownership of every path

`template-manifest.yaml` gives every path of the template one ownership: `platform`, `shared`, `product` or `template-only`. The first rule whose pattern matches a path wins; `*` matches within one folder, `**` across folders. Its `skills` list names the template's skills and their ownership, and each skill's front matter repeats it (`metadata.owner: template-website`, `metadata.ownership`).

`pnpm test` runs `scripts/check-template-manifest.mjs`, so `ci / ci` fails when:

- a file matches no rule;
- a folder in `.agents/skills/` isn't listed under `skills`, or a listed skill has no `SKILL.md`;
- a skill's front matter doesn't match its ownership, or its path has another ownership;
- a skill has no pointer `.claude/skills/<name>/SKILL.md` with the same front matter and ownership, or a pointer has no skill;
- the template block of `AGENTS.md` doesn't list exactly the `platform` and `shared` skills.

In a product repository there is no manifest, and the check passes at once.

When you add a file, give it a rule first. Choose by who changes it after the repository is created:

- `platform`: the platform team, and the product must take every change as it is;
- `shared`: a starting point the product team may adapt;
- `product`: the product's own from the first day;
- `template-only`: about maintaining the template.

## Changing the template

Every change is a PR to `main`, and `ci / ci` must pass. `update-from-template` and `docs/upgrading/README.md` have the same process in all three templates, apart from `metadata.owner` and the examples of the ownership table: change them in all three together. The `release` skill and `docs/deployment.md` of this template describe Cloudflare Pages and are its own.

How developers deploy and release is written in two places that must agree: `docs/deployment.md` ("Ship a change to dev", "Release to staging", "Promote to production", "Roll back", "When a run fails", "Versions and release notes", "Where the staging version is kept") and the `release` skill, which links to those headings and to the workflows' names. Change them together, and keep the headings the skill links to: changing one is breaking. A product repository gets the change only through a template release and its `update-from-template` PR, the canary first ([Releasing](#releasing)).

## Releasing

The `release-template` skill does these steps:

1. Choose the version from the changes since the last tag. **Breaking** means removing or renaming a path that products use, changing a `docs/` heading a skill links to, renaming a skill or a command, adding a skill name, or a new required variable or secret of the GitHub Environments. Breaking is a major version (a minor under `0.x`); a feature is a minor; a fix is a patch.
2. Write the notes `docs/upgrading/template-vX.Y.Z.md` (Breaking, Requires, Changes by ownership, Upgrade steps) and add a row to the table below.
3. Open the release PR `template-website vX.Y.Z`.
4. After the merge, when `ci` passes on the merge commit, the `template-release` workflow ([.github/workflows/template-release.yml](../.github/workflows/template-release.yml)) tags it `template-website/vX.Y.Z` (annotated, pushed alone) and publishes the GitHub Release with the notes. Nobody tags by hand. Never a `v*` tag. A tag is never moved or deleted. If it did not run, `release-template tag` starts it with the version. When `ci` failed on the merge commit, merge the fix as a normal PR, then start it: it tags the first later commit where `ci` passed, never past the next release's notes, so the release also contains the PRs merged until then. It pushes with a token of the org's GitHub App (org variable `RELEASE_APP_ID`, org secret `RELEASE_APP_PRIVATE_KEY`), the only bypass actor of the tag ruleset `release-tag-creation`.
5. The canary `<repository>` takes the release first with `update-from-template`. The other `active` repositories of this template in `catalog/repos.yaml` follow once its update is merged and deployed.

## Releases

| Version | Breaking | Requires | Notes |
| --- | --- | --- | --- |
| `v0.1.0` | yes (first release) | `app-workflows >= v0.2.0` | [template-v0.1.0.md](upgrading/template-v0.1.0.md) |
| `v0.1.1` | no | nothing new | [template-v0.1.1.md](upgrading/template-v0.1.1.md) |
| `v0.1.2` | no | nothing new | [template-v0.1.2.md](upgrading/template-v0.1.2.md) |
| `v0.2.0` | yes (Container Apps to Cloudflare Pages) | the Pages project and the GitHub Environments `dev`, `staging`, `production` with their variables and secret | [template-v0.2.0.md](upgrading/template-v0.2.0.md) |
| `v0.3.0` | yes (`ROBOTS_INDEX` no longer read, `--azure-*` options of `co2-estimate` removed) | nothing new beyond v0.2.0 | [template-v0.3.0.md](upgrading/template-v0.3.0.md) |
