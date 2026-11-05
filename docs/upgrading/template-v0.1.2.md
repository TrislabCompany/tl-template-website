# template-website v0.1.2

A fix: Claude Code lists the skills again. Since v0.1.0 the skills live in `.agents/skills/`, but Claude Code finds skills only in `.claude/skills/`. Each skill now has a pointer there: the same front matter, and a body that sends the agent to the real file.

## Breaking

No. No skill or command is renamed or added, no linked `docs/` heading changes, and nothing new is required. The new pointer check runs only where `template-manifest.yaml` exists, so it never runs in a product repository.

## Requires

Nothing new.

## Changes by ownership

All from [#9](https://github.com/TrislabCompany/tl-template-website/pull/9).

### platform

- **`.claude/skills/release/SKILL.md`, `.claude/skills/update-from-template/SKILL.md`**: new pointers to the skills in `.agents/skills/`.
- **`.agents/skills/update-from-template/SKILL.md`**:
  - Step 7 never touches a project skill's pointer.
  - In a repository without `.template-version`, a full template skill in `.claude/skills/` is replaced by the template's pointer. Any other full skill there is moved to `.agents/skills/` and gets a pointer.
- **`docs/upgrading/README.md`**: "Your own skills" says to add a pointer for each project skill.
- **`scripts/check-template-manifest.mjs`** and its tests: in the template, every skill needs a pointer with the same front matter and ownership, and every pointer needs a skill.

### shared

- **`AGENTS.md`**: a repository map row for `.claude/skills/`, and a line in "Skills" on adding a pointer with every new skill.
- **`.dockerignore`**: excludes `.claude`.

### product

Shown as a suggestion only: `README.md`. Its repository map row for the agent files adds `.claude/skills/`.

### template-only

- **`.claude/skills/release-template/SKILL.md`**: the pointer of the template's own skill.
- **`template-manifest.yaml`**: rules for the pointers.
- **`docs/template-releases.md`**: lists the pointer check.
- These notes.

## Upgrade steps

1. Copy the `platform` paths, including the two new pointers in `.claude/skills/`.
2. Take the `shared` changes. If the product changed `AGENTS.md` or `.dockerignore`, merge the new row, the line in "Skills" and the `.claude` entry into its version.
3. For each project skill in `.agents/skills/`, the team adds a pointer `.claude/skills/<name>/SKILL.md` with the same front matter and one line: read `.agents/skills/<name>/SKILL.md` and follow it. The update never writes it.
4. Write `.template-version` with `version: v0.1.2` and the tag's commit.
5. Check with `/reload-skills` in Claude Code that `release` and `update-from-template` are listed.
