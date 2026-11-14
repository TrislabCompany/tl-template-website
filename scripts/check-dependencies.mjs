// Checks that every dependency in package.json is pinned to an exact version
// (docs/dependencies.md): no range such as ^1.2.3, ~1.2.3, >=1, 1.x or *, and
// no tag such as latest. pnpm-lock.yaml pins what they depend on in turn.
// Run by `pnpm test` before the build, so ci runs it on every PR.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const FIELDS = ["dependencies", "devDependencies", "optionalDependencies"];
// 1.2.3, 1.2.3-rc.1, 1.2.3+build; or a pnpm protocol that pins by itself.
const EXACT = /^(\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?|workspace:.+|link:.+|file:.+)$/;

/** The problems of a parsed package.json: one line per dependency that isn't pinned exactly. */
export function unpinned(pkg) {
  const problems = [];
  for (const field of FIELDS) {
    for (const [name, version] of Object.entries(pkg[field] ?? {})) {
      if (!EXACT.test(version)) problems.push(`${field}.${name} is "${version}"; pin it exactly, for example "${version.replace(/^[\^~>=<\s]+/, "")}"`);
    }
  }
  return problems;
}

async function main() {
  const file = new URL("../package.json", import.meta.url);
  const problems = unpinned(JSON.parse(await readFile(file, "utf8")));
  if (problems.length > 0) {
    for (const problem of problems) console.error(`dependencies: ${problem}`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
