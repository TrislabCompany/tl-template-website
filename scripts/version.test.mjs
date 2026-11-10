// Unit tests for the release versions, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { test } from "node:test";
import { latest, next, parse } from "./version.mjs";

test("parses only exact vX.Y.Z tags", () => {
  assert.deepEqual(parse("v1.20.3"), [1, 20, 3]);
  assert.equal(parse("1.2.3"), undefined);
  assert.equal(parse("v1.2"), undefined);
  assert.equal(parse("v1.2.3-rc.1"), undefined);
  assert.equal(parse("v01.2.3"), undefined);
  assert.equal(parse("template-website/v0.1.2"), undefined);
});

test("finds the highest tag by semantic version, not by text", () => {
  assert.equal(latest(["v1.9.0", "v1.10.0", "v1.2.11", "v0.3.0-rc.1", "other"]), "v1.10.0");
  assert.equal(latest(["v2.0.0", "v10.0.0"]), "v10.0.0");
  assert.equal(latest([]), undefined);
  assert.equal(latest(["v1.0.0-rc.1"]), undefined);
});

test("bumps patch, minor and major", () => {
  assert.equal(next("v1.2.3", "patch"), "v1.2.4");
  assert.equal(next("v1.2.3", "minor"), "v1.3.0");
  assert.equal(next("v1.2.3", "major"), "v2.0.0");
});

test("starts from v0.0.0 when there is no tag", () => {
  assert.equal(next(undefined, "patch"), "v0.0.1");
  assert.equal(next(undefined, "minor"), "v0.1.0");
  assert.equal(next(undefined, "major"), "v1.0.0");
});

test("rejects an unknown bump", () => {
  assert.throws(() => next("v1.0.0", "huge"), /patch, minor, major/);
});
