// The release versions of this repository: the tags vX.Y.Z, in semantic
// version order. Used by the workflows (docs/deployment.md):
//
//   node scripts/version.mjs latest          the highest tag, e.g. v1.2.3
//   node scripts/version.mjs next <bump>     the next version for patch, minor
//                                            or major, and the previous one, as
//                                            lines for $GITHUB_OUTPUT:
//                                            version=v1.3.0 / previous=v1.2.3
//
// Reads the tags with `git tag --list "v*"`, so fetch them first. Other tags,
// and anything that is not exactly vX.Y.Z, are ignored.

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const BUMPS = ["patch", "minor", "major"];

/** [major, minor, patch] of a tag vX.Y.Z, or undefined. */
export function parse(tag) {
  const m = TAG.exec(tag.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
}

export function compare(a, b) {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/** The highest vX.Y.Z among the tags, or undefined when there is none. */
export function latest(tags) {
  const versions = tags.map((t) => t.trim()).filter((t) => parse(t));
  return versions.sort(compare).at(-1);
}

/** The version after `previous` (or after v0.0.0 when there is none). */
export function next(previous, bump) {
  if (!BUMPS.includes(bump)) throw new Error(`bump must be one of ${BUMPS.join(", ")}, not ${bump}`);
  const [major, minor, patch] = previous ? parse(previous) : [0, 0, 0];
  if (bump === "major") return `v${major + 1}.0.0`;
  if (bump === "minor") return `v${major}.${minor + 1}.0`;
  return `v${major}.${minor}.${patch + 1}`;
}

function gitTags() {
  return execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" }).split("\n").filter(Boolean);
}

function main([command, bump]) {
  const tags = gitTags();
  if (command === "latest") {
    const tag = latest(tags);
    if (!tag) throw new Error("there is no release tag vX.Y.Z yet");
    console.log(tag);
  } else if (command === "next") {
    const previous = latest(tags);
    console.log(`version=${next(previous, bump)}`);
    console.log(`previous=${previous ?? ""}`);
  } else {
    throw new Error("usage: node scripts/version.mjs latest | next <patch|minor|major>");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
