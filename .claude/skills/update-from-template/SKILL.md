---
name: update-from-template
description: Take the next release of this repository's template (the next minor version after .template-version, with its patches) into the repository as one PR — fetch the template's tags, apply the difference between the two releases path by path by the ownership in template-manifest.yaml (platform copied, shared 3-way merged, product left as suggestions, template-only skipped, project skills never touched), rewrite the template skills block of AGENTS.md, do the release notes' upgrade steps, run the checks, bump .template-version and open the PR. Use when the user asks to update from the template, take a template release, sync with the template, or when a template update PR is due.
metadata:
  owner: template-website
  ownership: platform
---

# update-from-template

A pointer, so that Claude Code lists this skill: it finds skills only in `.claude/skills/`. Read [.agents/skills/update-from-template/SKILL.md](../../../.agents/skills/update-from-template/SKILL.md) and follow it exactly. That file is the skill; edit it, not this one. `pnpm test` checks that the front matter of both is the same.
