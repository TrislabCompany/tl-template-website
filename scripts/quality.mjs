// The accessibility and Lighthouse checks on the built site (docs/quality-checks.md),
// run after `pnpm test` (which builds dist/). ci / ci runs both on every PR commit:
//   node scripts/quality.mjs a11y         (also locally: `pnpm test:a11y`)
//   node scripts/quality.mjs lighthouse   (on GitHub only)
//
// It serves a copy of dist/ set up as production (scripts/write-config.mjs:
// /config.json) with `wrangler pages dev`, so public/_headers
// (the Content-Security-Policy among them) applies as on Cloudflare Pages, then runs:
//   - pa11y-ci (axe + HTML_CodeSniffer, WCAG 2 AA) on every URL of the sitemap, settings in .pa11yci.json
//   - Lighthouse CI on the pages in lighthouserc.json, with the score and Core Web Vitals limits there
// Reports go to .quality/. QUALITY_BASE_URL checks a running site instead of serving dist/.
// QUALITY_PAGES (space-separated paths, from scripts/ci-scope.mjs) checks only those pages.
// QUALITY_PORT serves dist/ on another port than 8788, when that one is taken.

import { spawn } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const OUT = ".quality";
const PORT = Number(process.env.QUALITY_PORT ?? 8788);
const SITE = `${OUT}/site`;

/** The <loc> URLs of a sitemap. */
export function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/** The same path, query and hash on another origin. */
export function rebase(url, base) {
  const u = new URL(url, base);
  return new URL(u.pathname + u.search + u.hash, base).href;
}

/** The pages to check, from QUALITY_PAGES (scripts/ci-scope.mjs); empty means every page. */
const PAGES = (process.env.QUALITY_PAGES ?? "").split(/\s+/).filter(Boolean);

const trimSlash = (path) => path.replace(/\/+$/, "") || "/";

/** The URLs whose path is one of `pages` (trailing slashes don't count), or every URL when `pages` is empty. */
export function onlyPages(urls, pages) {
  if (pages.length === 0) return urls;
  const want = new Set(pages.map(trimSlash));
  return urls.filter((u) => want.has(trimSlash(new URL(u).pathname)));
}

/** pa11y-ci settings with the URLs to check. */
export function pa11yConfig(settings, urls) {
  return { ...settings, urls };
}

/** lighthouserc with its relative collect.url resolved against the base URL and reports in outDir. */
export function lighthouseConfig(rc, base, outDir) {
  const ci = rc.ci ?? {};
  return {
    ...rc,
    ci: {
      ...ci,
      collect: { ...ci.collect, url: (ci.collect?.url ?? []).map((p) => rebase(p, base)) },
      upload: { target: "filesystem", outputDir: outDir, ...ci.upload },
    },
  };
}

const LIGHTHOUSE_CATEGORIES = [
  ["performance", "Performance"],
  ["accessibility", "Accessibility"],
  ["best-practices", "Best practices"],
  ["seo", "SEO"],
];

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
const LIGHTHOUSE_METRICS = [
  ["largest-contentful-paint", "LCP", seconds],
  ["cumulative-layout-shift", "CLS", (v) => v.toFixed(2)],
  ["total-blocking-time", "TBT", (ms) => `${Math.round(ms)} ms`],
  ["first-contentful-paint", "FCP", seconds],
];

/**
 * The Lighthouse results as a Markdown table: one row per page ({ url, scores, metrics }),
 * each value marked against its limit in lighthouserc (✅ within, ❌ over).
 */
export function lighthouseMarkdown(runs, rc) {
  const assertions = rc.ci?.assert?.assertions ?? {};
  const limit = (id) => assertions[id]?.[1] ?? {};
  const mark = (ok) => (ok === undefined ? "" : ok ? " ✅" : " ❌");
  const cell = (value, text, ok) => (typeof value === "number" ? `${text(value)}${mark(ok(value))}` : "–");

  const header = ["Page", ...LIGHTHOUSE_CATEGORIES.map(([, name]) => name), ...LIGHTHOUSE_METRICS.map(([, name]) => name)];
  const rows = runs.map((r) => {
    const scores = LIGHTHOUSE_CATEGORIES.map(([id]) => {
      const min = limit(`categories:${id}`).minScore;
      return cell(r.scores?.[id], (s) => Math.round(s * 100), (s) => (min === undefined ? undefined : s >= min));
    });
    const metrics = LIGHTHOUSE_METRICS.map(([id, , text]) => {
      const max = limit(id).maxNumericValue;
      return cell(r.metrics?.[id], text, (v) => (max === undefined ? undefined : v <= max));
    });
    return `| ${[new URL(r.url).pathname, ...scores, ...metrics].join(" | ")} |`;
  });
  return (
    `| ${header.join(" | ")} |\n| ${header.map(() => "---").join(" | ")} |\n${rows.join("\n")}\n\n` +
    "The median of the runs of each page, on a simulated mid-range phone. ✅ within the limit in `lighthouserc.json`, ❌ over it.\n"
  );
}

/** A Chrome or Chromium on this machine, for Puppeteer (pa11y) and Lighthouse. */
export function findChrome(env = process.env, platform = process.platform, exists = existsSync) {
  if (env.CHROME_PATH) return env.CHROME_PATH;
  if (env.PUPPETEER_EXECUTABLE_PATH) return env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = {
    win32: [
      `${env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
      `${env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
  }[platform] ?? ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidates.find((p) => exists(p));
}

function run(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

/** Stops the server and everything it started (wrangler runs workerd as a child). */
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise((r) => spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" }).on("close", r));
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

/** A copy of dist/ as it is deployed to production: dist/ itself is left as it is. */
async function prepareSite() {
  rmSync(SITE, { recursive: true, force: true });
  cpSync("dist", SITE, { recursive: true });
  const env = { ...process.env, PLATFORM_ENVIRONMENT: "production", VARS_JSON: "" };
  if ((await run("node", ["scripts/write-config.mjs", SITE], env)) !== 0) throw new Error("quality: write-config.mjs failed.");
}

async function serve(base) {
  await prepareSite();
  // No shared stdio: a pipe held open by workerd would keep this script from ending.
  const child = spawn("pnpm", ["exec", "wrangler", "pages", "dev", SITE, "--port", String(PORT), "--ip", "127.0.0.1"], {
    stdio: "ignore",
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("quality: wrangler pages dev stopped before it served dist/.");
    try {
      if ((await fetch(base)).status < 500) return child;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  await stop(child);
  throw new Error(`quality: ${base} did not answer within 120 s.`);
}

function summary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
}

/** Every page of dist/sitemap-*.xml, on the base URL. */
function sitemapUrls(base) {
  const files = readdirSync("dist").filter((f) => /^sitemap-\d+\.xml$/.test(f));
  return [...new Set(files.flatMap((f) => sitemapLocs(readFileSync(`dist/${f}`, "utf8"))).map((u) => rebase(u, base)))];
}

async function a11y(base, env) {
  const all = sitemapUrls(base);
  if (all.length === 0) {
    console.error("quality: no URLs in dist/sitemap-*.xml.");
    return 1;
  }
  const urls = onlyPages(all, PAGES);
  if (urls.length === 0) {
    console.log("\naccessibility: none of the pages in QUALITY_PAGES is in the sitemap, nothing to check.");
    return 0;
  }
  const settings = JSON.parse(readFileSync(".pa11yci.json", "utf8"));
  writeFileSync(`${OUT}/pa11yci.json`, JSON.stringify(pa11yConfig(settings, urls), null, 2));
  console.log(`\naccessibility: pa11y-ci on ${urls.length} pages\n`);
  const code = await run("pnpm", ["exec", "pa11y-ci", "--config", `${OUT}/pa11yci.json`], env);

  if (existsSync(`${OUT}/pa11y.json`)) {
    const report = JSON.parse(readFileSync(`${OUT}/pa11y.json`, "utf8"));
    const failing = Object.entries(report.results ?? {}).filter(([, issues]) => issues.length > 0);
    const rows = failing.map(([url, issues]) => `| ${new URL(url).pathname} | ${issues.length} | ${[...new Set(issues.map((i) => i.code))].slice(0, 3).join(", ")} |`);
    summary(
      `### Accessibility (pa11y-ci)\n\n${report.passes ?? 0} of ${report.total ?? urls.length} pages without errors.\n` +
        (rows.length ? `\n| Page | Errors | Rules |\n| --- | --- | --- |\n${rows.join("\n")}\n` : ""),
    );
  }
  return code;
}

async function lighthouse(base, env) {
  const rc = JSON.parse(readFileSync("lighthouserc.json", "utf8"));
  if (PAGES.length) {
    // Only the pages the PR changes (QUALITY_PAGES), instead of the list in lighthouserc.json.
    const paths = onlyPages(sitemapUrls(base), PAGES).map((u) => new URL(u).pathname);
    if (paths.length === 0) {
      console.log("\nLighthouse: none of the pages in QUALITY_PAGES is in the sitemap, nothing to check.");
      return 0;
    }
    rc.ci = { ...rc.ci, collect: { ...rc.ci?.collect, url: paths } };
  }
  writeFileSync(`${OUT}/lighthouserc.json`, JSON.stringify(lighthouseConfig(rc, base, `${OUT}/lighthouse`), null, 2));
  console.log("\nLighthouse CI\n");
  const code = await run("pnpm", ["exec", "lhci", "autorun", `--config=${OUT}/lighthouserc.json`], env);

  // The median run of each page, as a table for the job summary and, through
  // .quality/lighthouse.md in the reports artifact, for the PR comment (ci.yml).
  const manifest = `${OUT}/lighthouse/manifest.json`;
  if (existsSync(manifest)) {
    const runs = JSON.parse(readFileSync(manifest, "utf8"))
      .filter((r) => r.isRepresentativeRun)
      .map((r) => {
        const lhr = JSON.parse(readFileSync(isAbsolute(r.jsonPath) ? r.jsonPath : `${OUT}/lighthouse/${r.jsonPath}`, "utf8"));
        const metrics = Object.fromEntries(LIGHTHOUSE_METRICS.map(([id]) => [id, lhr.audits?.[id]?.numericValue]));
        return { url: r.url, scores: r.summary, metrics };
      });
    const markdown = `### Lighthouse\n\n${lighthouseMarkdown(runs, rc)}`;
    writeFileSync(`${OUT}/lighthouse.md`, markdown);
    summary(markdown);
  }
  return code;
}

async function main() {
  const mode = process.argv[2] ?? "a11y";
  if (!["a11y", "lighthouse"].includes(mode)) {
    console.error("usage: node scripts/quality.mjs [a11y|lighthouse]");
    process.exit(2);
  }
  // Lighthouse runs on GitHub only: its timings depend on the machine, and the
  // limits are set for the CI runner. LHCI_LOCAL=1 runs it here to debug.
  if (mode === "lighthouse" && !process.env.GITHUB_ACTIONS && !process.env.LHCI_LOCAL) {
    console.error("quality: Lighthouse runs in ci / ci on GitHub (docs/quality-checks.md). Set LHCI_LOCAL=1 to run it here anyway.");
    process.exit(2);
  }
  if (!existsSync("dist/index.html")) {
    console.error("quality: dist/ is missing. Run `pnpm test` or `pnpm build` first.");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });

  const chrome = findChrome();
  if (!chrome) {
    console.error("quality: no Chrome found. Install Chrome or set CHROME_PATH.");
    process.exit(1);
  }
  const env = { ...process.env, CHROME_PATH: chrome, PUPPETEER_EXECUTABLE_PATH: chrome, PUPPETEER_SKIP_DOWNLOAD: "1", LHCI_NO_LIGHTHOUSERC: "1" };

  const base = process.env.QUALITY_BASE_URL ?? `http://127.0.0.1:${PORT}/`;
  const server = process.env.QUALITY_BASE_URL ? undefined : await serve(base);
  let code;
  try {
    code = mode === "a11y" ? await a11y(base, env) : await lighthouse(base, env);
  } finally {
    await stop(server);
  }
  if (code) {
    console.error(`\nquality: ${mode} failed. Reports are in ${OUT}/ (docs/quality-checks.md).`);
    process.exit(1);
  }
  console.log(`\nquality: ${mode} ok.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
