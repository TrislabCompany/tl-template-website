---
name: release
description: Deploy, release, promote or roll back this app, or show which version runs in which Environment — ship a merged change to dev, tag vX.Y.Z for the release tier after checking every release tag requirement, promote a version to prod, roll back to the previous version — following the steps for developers in docs/deployment.md. Use when the user asks to deploy, release, tag, promote, roll back, ship to production, or where a version runs.
metadata:
  owner: template-website
  ownership: platform
---

# release

A pointer, so that Claude Code lists this skill: it finds skills only in `.claude/skills/`. Read [.agents/skills/release/SKILL.md](../../../.agents/skills/release/SKILL.md) and follow it exactly. That file is the skill; edit it, not this one. `pnpm test` checks that the front matter of both is the same.
