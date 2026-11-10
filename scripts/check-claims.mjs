// Checks that what the legal pages promise about the site is true of the build,
// so the statements can't drift from the code. Run by `pnpm test` after
// check-page-weight.mjs, so ci runs it on every PR.
//
// 1. "No JavaScript" (sustainability page, accessibility statement): once a
//    production deploy has taken the environment badge out
//    (scripts/write-config.mjs), no page loads or contains a script. JSON-LD
//    is data, not code, and is allowed.
// 2. The published footprint (sustainability page, every language): the
//    average page weight and the CO2e per page view must match the build,
//    within the rounding the page uses. When the check fails, update the
//    figures in src/content/legal/<lang>/sustainability.md.
//
// The browser check (scripts/check-browser.mjs) covers the other promises:
// WCAG 2.1 AA, reflow, no cookies, no storage and no third-party requests.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { calculate } from "./co2-estimate.mjs";
import { withoutBadge } from "./write-config.mjs";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const dist = join(rootDir, "dist");
const KB = 1024;
/** How far the published page weight may be from the build: it is rounded ("about 145 KB"). */
const WEIGHT_TOLERANCE = 0.1;
/** The published CO2e per view has two decimals ("about 0.02 g"). */
const GRAMS_TOLERANCE = 0.005;

/** Scripts a page still runs: every <script> except JSON-LD. */
export function scriptsIn(html) {
  return [...html.matchAll(/<script\b[^>]*>/gi)].map(([tag]) => tag).filter((tag) => !/type=["']application\/ld\+json["']/i.test(tag));
}

/** The figures in a sustainability page: the first "<n> KB" and "<n> g CO₂e" in its text. */
export function publishedFigures(markdown) {
  const number = (text) => (text === undefined ? undefined : Number(text.replace(",", ".")));
  return {
    kb: number(markdown.match(/(\d+(?:[.,]\d+)?)\s*KB/)?.[1]),
    grams: number(markdown.match(/(\d+(?:[.,]\d+)?)\s*g CO₂e/)?.[1]),
  };
}

async function main() {
  const failures = [];

  const files = (await readdir(dist, { withFileTypes: true, recursive: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => join(entry.parentPath, entry.name));
  for (const file of files) {
    const scripts = scriptsIn(withoutBadge(await readFile(file, "utf8")));
    if (scripts.length > 0) failures.push(`${file.slice(dist.length)} runs a script in production: ${scripts[0]}`);
  }

  const report = JSON.parse(await readFile(join(rootDir, "page-weight-report.json"), "utf8"));
  const builtKb = report.averageBytes / KB;
  const builtGrams = calculate({ averageBytes: report.averageBytes, visits: 1 }).kgPerVisit * 1000;
  const legal = join(rootDir, "src", "content", "legal");
  for (const lang of await readdir(legal)) {
    const page = join(legal, lang, "sustainability.md");
    const text = await readFile(page, "utf8").catch(() => undefined);
    if (text === undefined) continue;
    const { kb, grams } = publishedFigures(text);
    if (kb === undefined || Math.abs(kb - builtKb) / builtKb > WEIGHT_TOLERANCE) {
      failures.push(`${lang}/sustainability.md says ${kb} KB per page; the build averages ${builtKb.toFixed(1)} KB`);
    }
    if (grams === undefined || Math.abs(grams - builtGrams) > GRAMS_TOLERANCE) {
      failures.push(`${lang}/sustainability.md says ${grams} g CO2e per view; the build gives ${builtGrams.toFixed(4)} g`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`claims: ${failure}`);
    process.exit(1);
  }
  console.log(
    `claims: ok. ${files.length} pages run no JavaScript in production; ${builtKb.toFixed(1)} KB and ${builtGrams.toFixed(4)} g CO2e per view match the sustainability page.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
