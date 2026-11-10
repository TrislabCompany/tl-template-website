// Opens every built page in a real browser (Chromium, through Playwright) and
// checks what the accessibility statement and the privacy policy promise:
//
// - WCAG 2.1 level A and AA: axe-core finds no violations, on a desktop screen
//   and on a 320 pixel wide one. Its best-practice rules run too: one main
//   heading, headings in order, landmarks, a working skip link.
// - Reflow: at 320 pixels nothing scrolls sideways (WCAG 1.4.10).
// - No cookies and nothing stored on the device: no cookie, localStorage or
//   sessionStorage entry after a page has loaded.
// - No third-party content: every request goes to the site itself.
//
// Run by `pnpm test` after the build, so ci runs it on every PR. It serves
// dist/ itself the way Cloudflare Pages does (/en/about is en/about.html).
// Needs Chromium once per machine: pnpm exec playwright install chromium
//
// axe-core finds the barriers a program can find, about half of the WCAG
// criteria; keyboard use and screen readers still need a person.

import { createServer } from "node:http";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const dist = join(rootDir, "dist");
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "320px", width: 320, height: 640 },
];
const PARALLEL = 8;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

/** The file in dist/ for an address, as Cloudflare Pages finds it; undefined when there is none. */
export function fileFor(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^[\\/]+/, "");
  if (clean.startsWith("..")) return undefined;
  if (clean === "") return "index.html";
  return extname(clean) ? clean : `${clean}.html`;
}

/** The address of a built page: en/about.html is /en/about, index.html is /. */
export function pathFor(file) {
  const path = `/${file.split(sep).join("/")}`.replace(/\.html$/, "");
  return path === "/index" ? "/" : path;
}

function serve() {
  const server = createServer(async (request, response) => {
    const file = fileFor(new URL(request.url, "http://localhost").pathname);
    try {
      if (!file) throw new Error("outside dist");
      const body = await readFile(join(dist, file));
      response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404, { "Content-Type": TYPES[".html"] });
      response.end(await readFile(join(dist, "404.html")).catch(() => ""));
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Each page gets a browser context of its own, so a cookie or stored value is
// blamed on the page that set it.
async function checkPage(browser, origin, path, viewport) {
  const problems = [];
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  // Requests to other sites are noted and never sent.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    problems.push(`loads ${url.href} from another site`);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: "load" });

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  for (const violation of results.violations) {
    const where = violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(", ");
    problems.push(`${violation.id} (${violation.impact}): ${violation.help} at ${where}`);
  }

  const state = await page.evaluate(() => ({
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    storage: localStorage.length + sessionStorage.length,
  }));
  if (viewport.width <= 320 && state.sideways) problems.push("scrolls sideways at 320 pixels");
  if (state.storage > 0) problems.push("stores data in localStorage or sessionStorage");
  if ((await context.cookies()).length > 0) problems.push("sets a cookie");

  await context.close();
  return problems.map((problem) => `${path} (${viewport.name}): ${problem}`);
}

async function main() {
  const pages = (await readdir(dist, { withFileTypes: true, recursive: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => pathFor(relative(dist, join(entry.parentPath, entry.name))))
    // "/" only leads to the default language (astro.config.mjs).
    .filter((path) => path !== "/")
    .sort();

  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    server.close();
    console.error("browser check: Chromium is missing. Install it once with: pnpm exec playwright install chromium");
    throw error;
  }

  const failures = [];
  try {
    const queue = VIEWPORTS.flatMap((viewport) => pages.map((path) => ({ path, viewport })));
    await Promise.all(
      Array.from({ length: PARALLEL }, async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          failures.push(...(await checkPage(browser, origin, job.path, job.viewport)));
        }
      }),
    );
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length > 0) {
    for (const failure of failures.sort()) console.error(`browser check: ${failure}`);
    process.exit(1);
  }
  console.log(
    `browser check: ok. ${pages.length} pages at ${VIEWPORTS.map((v) => v.name).join(" and ")}: no WCAG 2.1 AA or best-practice violations found by axe-core, no sideways scrolling, no cookies or storage, no third-party requests.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
