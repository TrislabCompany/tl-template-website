---
name: release-template
description: Prepare a release of this template — choose the next template-<type>/vX.Y.Z version, write its release notes and their row in docs/template-releases.md, run the checks and open the release PR; after the merge, check the tag and the GitHub Release the workflow made. Only in the template repository itself. Use when a maintainer asks to release, version or tag the template.
disable-model-invocation: true
metadata:
  owner: template-website
  ownership: template-only
---

# release-template

A pointer, so that Claude Code lists this skill: it finds skills only in `.claude/skills/`. Read [.agents/skills/release-template/SKILL.md](../../../.agents/skills/release-template/SKILL.md) and follow it exactly. That file is the skill; edit it, not this one. `pnpm test` checks that the front matter of both is the same.
