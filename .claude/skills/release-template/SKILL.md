---
name: release-template
description: Prepare a release of this template — choose the next template-<type>/vX.Y.Z version from the merged changes and the breaking rules, write the release notes docs/upgrading/template-vX.Y.Z.md (changes by ownership, upgrade steps, requires, breaking) and their row in docs/template-releases.md, run the checks and open the release PR; after the merge, check the commit and hand the tag command to an organization owner, then point to the canary's update. Only in the template repository itself. Use when a maintainer asks to release, version or tag the template.
metadata:
  owner: template-website
  ownership: template-only
---

# release-template

A pointer, so that Claude Code lists this skill: it finds skills only in `.claude/skills/`. Read [.agents/skills/release-template/SKILL.md](../../../.agents/skills/release-template/SKILL.md) and follow it exactly. That file is the skill; edit it, not this one. `pnpm test` checks that the front matter of both is the same.
