# template-website v0.1.1

Docs only: how a developer deploys and releases with the agent, and how to see which version runs in which Environment.

## Breaking

No. Every heading of `docs/deployment.md` that the `release` skill links to stays the same. The new section adds headings only.

## Requires

Nothing new.

## Changes by ownership

The PR of this release.

### platform

None.

### shared

- **`docs/deployment.md`**:
  - A new section, "Release with the agent", placed before "Steps for developers". For each `release` skill command, it says what the command checks, what it changes and whether it asks first. It also walks through a release from start to end and lists what the skill never does.
  - "What runs where" now says that `dev` runs the newest `main` and the other tiers run tags. It also says where to see the version: `release status`, the Deployments page or the Releases page.
- **`AGENTS.md`**: the rule on deploying points to "Release with the agent".

### product

Shown as a suggestion only: `README.md`. Its "First steps" 4 now names the `release` commands and links to "Release with the agent".

### template-only

- `docs/template-releases.md`, which now says that the deployment docs and the `release` skill change together and reach products through a release.
- These notes.

## Upgrade steps

1. Take the `shared` changes. If the product changed `docs/deployment.md` or `AGENTS.md`, merge the new section and the changed rule into its version.
2. Write `.template-version` with `version: v0.1.1` and the tag's commit.
