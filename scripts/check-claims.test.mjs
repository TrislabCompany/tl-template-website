// Unit tests for the claims check, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { test } from "node:test";
import { publishedFigures, scriptsIn } from "./check-claims.mjs";

test("JSON-LD is data, every other script counts", () => {
  assert.deepEqual(scriptsIn('<script type="application/ld+json">{}</script><p>x</p>'), []);
  assert.deepEqual(scriptsIn('<script type="module" src="/_astro/a.js"></script>'), ['<script type="module" src="/_astro/a.js">']);
  assert.deepEqual(scriptsIn("<SCRIPT>alert(1)</SCRIPT>"), ["<SCRIPT>"]);
});

test("reads the published figures, with a decimal point or comma", () => {
  assert.deepEqual(publishedFigures("| Weight | about 145 KB |\n| CO2 | about 0.02 g CO₂e |"), { kb: 145, grams: 0.02 });
  assert.deepEqual(publishedFigures("| Peso | circa 145 KB |\n| CO2 | circa 0,02 g CO₂e |"), { kb: 145, grams: 0.02 });
  assert.deepEqual(publishedFigures("no figures"), { kb: undefined, grams: undefined });
});
