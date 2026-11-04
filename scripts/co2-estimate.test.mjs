// Unit tests for the CO2 estimate, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNote, calculate, parseCliArgs } from "./co2-estimate.mjs";

const now = new Date("2026-11-04T10:00:00Z");
const base = ["--visits", "1000", "--visits-source", "Cloudflare traffic statistics"];

test("parses the required arguments and defaults the year", () => {
  const options = parseCliArgs(base, now);
  assert.equal(options.visits, 1000);
  assert.equal(options.visitsSource, "Cloudflare traffic statistics");
  assert.equal(options.year, 2026);
  assert.equal(options.green, false);
  assert.equal(options.azure, undefined);
  assert.match(options.out, /co2[\\/]2026\.md$/);
});

test("parses the Azure figure with its period and a default source", () => {
  const options = parseCliArgs([...base, "--azure-kg", "12.5", "--azure-period", "2025-11 to 2026-10"], now);
  assert.deepEqual(options.azure, { kg: 12.5, period: "2025-11 to 2026-10", source: "Azure carbon optimization report" });
});

test("rejects missing, wrong and unknown arguments", () => {
  assert.throws(() => parseCliArgs(["--visits-source", "x"], now), /--visits/);
  assert.throws(() => parseCliArgs(["--visits", "100"], now), /--visits-source/);
  assert.throws(() => parseCliArgs(["--visits", "0", "--visits-source", "x"], now), /--visits/);
  assert.throws(() => parseCliArgs(["--visits", "1.5", "--visits-source", "x"], now), /whole number/);
  assert.throws(() => parseCliArgs(["--visits", "abc", "--visits-source", "x"], now), /--visits/);
  assert.throws(() => parseCliArgs([...base, "--azure-kg", "5"], now), /--azure-period/);
  assert.throws(() => parseCliArgs([...base, "--azure-period", "2026"], now), /--azure-kg/);
  assert.throws(() => parseCliArgs([...base, "--unknown"], now));
});

test("--help needs no other argument", () => {
  assert.deepEqual(parseCliArgs(["--help"], now), { help: true });
});

test("calculates the result per visit and per year with SWD v4", () => {
  const one = calculate({ averageBytes: 1_000_000, visits: 1 });
  const many = calculate({ averageBytes: 1_000_000, visits: 1000 });
  assert.ok(one.kgPerVisit > 0);
  assert.ok(Math.abs(many.kgPerYear - one.kgPerVisit * 1000) < 1e-12);
  // About 0.2 to 0.4 g CO2e for 1 MB; a loose range that fails on a wrong unit.
  assert.ok(one.kgPerVisit * 1000 > 0.05 && one.kgPerVisit * 1000 < 1);
});

test("green hosting lowers the result and a heavier page raises it", () => {
  const grey = calculate({ averageBytes: 500_000, visits: 10 });
  const green = calculate({ averageBytes: 500_000, visits: 10, green: true });
  const heavy = calculate({ averageBytes: 1_000_000, visits: 10 });
  assert.ok(green.kgPerYear < grey.kgPerYear);
  assert.ok(heavy.kgPerYear > grey.kgPerYear);
});

test("refuses a page weight of 0", () => {
  assert.throws(() => calculate({ averageBytes: 0, visits: 10 }), /page weight/);
});

test("the note names the sources, versions, assumptions and the shared parts", () => {
  const input = {
    year: 2026,
    date: "2026-11-04",
    averageBytes: 4096,
    pageCount: 12,
    visits: 1000,
    visitsSource: "Cloudflare traffic statistics",
    green: false,
    co2jsVersion: "0.19.0",
    result: { kgPerVisit: 0.0001, kgPerYear: 0.1 },
  };
  const without = buildNote(input);
  assert.match(without, /Cloudflare traffic statistics/);
  assert.match(without, /Sustainable Web Design, version 4/);
  assert.match(without, /CO2\.js \(@tgwf\/co2\) 0\.19\.0/);
  assert.match(without, /not split per site/);
  assert.match(without, /No Azure figure given/);
  const withAzure = buildNote({ ...input, azure: { kg: 12.5, period: "2025-11 to 2026-10", source: "Azure carbon optimization report" } });
  assert.match(withAzure, /12\.5 kg CO2e/);
  assert.match(withAzure, /2025-11 to 2026-10/);
});
