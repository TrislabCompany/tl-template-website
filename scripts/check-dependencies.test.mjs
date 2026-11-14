// Unit tests for the dependency pin check, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { test } from "node:test";
import { unpinned } from "./check-dependencies.mjs";

test("accepts exact versions, prereleases and pnpm protocols", () => {
  const pkg = {
    dependencies: { astro: "7.3.3", next: "1.0.0-rc.1" },
    devDependencies: { local: "workspace:*", tool: "link:../tool" },
  };
  assert.deepEqual(unpinned(pkg), []);
});

test("flags ranges and tags in every dependency field", () => {
  const pkg = {
    dependencies: { a: "^5.3.0" },
    devDependencies: { b: "~1.2.3", c: "latest" },
    optionalDependencies: { d: ">=2" },
  };
  const problems = unpinned(pkg);
  assert.equal(problems.length, 4);
  assert.match(problems[0], /dependencies\.a is "\^5\.3\.0"; pin it exactly, for example "5\.3\.0"/);
});

test("ignores peer dependencies and engines, which are ranges by design", () => {
  assert.deepEqual(unpinned({ peerDependencies: { react: "^19" }, engines: { node: "22" } }), []);
});

test("accepts a package.json without dependencies", () => {
  assert.deepEqual(unpinned({}), []);
});
