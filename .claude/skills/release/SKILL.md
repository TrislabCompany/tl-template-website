---
name: release
description: Deploy, release or promote this site on Cloudflare Pages, or show which version runs in which Environment — follow a merged change to dev, run the Release new version workflow to tag and build the next vX.Y.Z and deploy it to staging, run Promote to production, explain a rollback — following docs/deployment.md. Use when the user asks to deploy, release, tag, promote, roll back, ship to production, or where a version runs.
metadata:
  owner: template-website
  ownership: platform
---

# release

A pointer, so that Claude Code lists this skill: it finds skills only in `.claude/skills/`. Read [.agents/skills/release/SKILL.md](../../../.agents/skills/release/SKILL.md) and follow it exactly. That file is the skill; edit it, not this one. `pnpm test` checks that the front matter of both is the same.
