// The protection rule on the real build (docs/deployment.md#search-engines):
// a deploy to any Environment other than production is noindex, nofollow,
// even when ROBOTS_INDEX=true. For dev, staging and an Environment with no
// name, this check copies dist/, prepares the copy with scripts/write-config.mjs
// as a deploy does, with ROBOTS_INDEX=true set both as a variable of the GitHub
// Environment and in the process, and fails unless the copy has:
//   - X-Robots-Tag: noindex, nofollow on every path (_headers, rule /*),
//   - <meta name="robots" content="noindex, nofollow"> on every page, once,
//   - robots.txt with "Disallow: /" and no "Allow",
//   - no sitemap file.
// It also prepares production with ROBOTS_INDEX=true and checks that the
// site is then open, so the rule is not simply "always closed".
// Run by `pnpm test` after the build. dist/ itself is left as it is.

import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isSitemapFile, prepare } from "./write-config.mjs";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

async function listing(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath, e.name)).split("\\").join("/"));
}

/** What is wrong with a prepared copy of the site that must be closed to search engines. */
export async function closedProblems(dir) {
  const problems = [];
  const headers = await readFile(join(dir, "_headers"), "utf8");
  if (!/^\/\*\n(?:[^\n]*\n)*? {2}X-Robots-Tag: noindex, nofollow$/m.test(headers.replace(/\r\n/g, "\n"))) {
    problems.push("_headers has no X-Robots-Tag: noindex, nofollow in the rule /*");
  }
  const robots = await readFile(join(dir, "robots.txt"), "utf8").catch(() => "");
  if (!/^Disallow: \/$/m.test(robots) || /^Allow:/im.test(robots) || /^Sitemap:/im.test(robots)) {
    problems.push("robots.txt is not just Disallow: /");
  }
  const files = await listing(dir);
  for (const file of files.filter((f) => isSitemapFile(f))) problems.push(`${file} is still there`);
  for (const file of files.filter((f) => f.endsWith(".html"))) {
    const tags = (await readFile(join(dir, file), "utf8")).match(/<meta\b[^>]*\bname=["']robots["'][^>]*>/gi) ?? [];
    if (tags.length !== 1 || !tags[0].includes('content="noindex, nofollow"')) problems.push(`${file} has ${tags.length} robots meta tags: ${tags.join("")}`);
  }
  return problems;
}

async function main() {
  const failures = [];
  const cases = [
    { environment: "dev" },
    { environment: "staging" },
    { environment: "preview" },
    { environment: undefined },
  ];
  for (const { environment } of cases) {
    const copy = await mkdtemp(join(tmpdir(), "check-noindex-"));
    try {
      await cp(dist, copy, { recursive: true });
      const env = { ROBOTS_INDEX: "true", ...(environment ? { PLATFORM_ENVIRONMENT: environment } : {}) };
      await prepare(copy, { vars: { ROBOTS_INDEX: "true", PLATFORM_ENVIRONMENT: "production" }, env });
      for (const problem of await closedProblems(copy)) failures.push(`${environment ?? "(no environment)"}: ${problem}`);
    } finally {
      await rm(copy, { recursive: true, force: true });
    }
  }

  const copy = await mkdtemp(join(tmpdir(), "check-noindex-"));
  try {
    await cp(dist, copy, { recursive: true });
    await prepare(copy, { env: { PLATFORM_ENVIRONMENT: "production", ROBOTS_INDEX: "true" } });
    const files = await listing(copy);
    if (!files.some((f) => isSitemapFile(f))) failures.push("production with ROBOTS_INDEX=true has no sitemap");
    if (!/^Allow: \/$/m.test(await readFile(join(copy, "robots.txt"), "utf8"))) failures.push("production with ROBOTS_INDEX=true has no open robots.txt");
  } finally {
    await rm(copy, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`noindex: ${failure}`);
    process.exit(1);
  }
  console.log(`noindex: ok. dev, staging, an unknown and a missing Environment stay noindex, nofollow with ROBOTS_INDEX=true; production opens only with it.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
