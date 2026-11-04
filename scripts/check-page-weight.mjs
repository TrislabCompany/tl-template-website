// The page-weight budget: after `astro build`, adds up for every HTML page in
// dist/ the page itself and every local file it loads (stylesheets, scripts,
// images, icons, and the fonts and images those stylesheets load), and fails
// when a page is over the limits in page-weight.config.json. Sizes are the
// files as built, before compression, so the check is on the safe side.
// Writes the figures to page-weight-report.json (not served), which a yearly
// CO2 estimate can reuse. Run by `pnpm test`, so ci runs it on every PR.

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const dist = join(rootDir, "dist");
const config = JSON.parse(await readFile(join(rootDir, "page-weight.config.json"), "utf8"));
const KB = 1024;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])),
  );
  return files.flat();
}

const sizeCache = new Map();
async function size(file) {
  if (!sizeCache.has(file)) {
    sizeCache.set(
      file,
      stat(file).then(
        (info) => info.size,
        () => 0,
      ),
    );
  }
  return sizeCache.get(file);
}

/** A local URL in a page or stylesheet, as a file in dist/; undefined for outside or data: URLs. */
function toFile(url, fromFile) {
  if (!url || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return undefined;
  const path = url.split(/[?#]/)[0];
  if (!path) return undefined;
  return path.startsWith("/") ? join(dist, path) : join(fromFile, "..", path);
}

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];

function pageResources(html, file) {
  const found = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attribute(tag, "rel") ?? "").toLowerCase();
    if (/\b(stylesheet|icon|modulepreload|preload)\b/.test(rel)) found.push(toFile(attribute(tag, "href"), file));
  }
  for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) found.push(toFile(attribute(tag, "src"), file));
  for (const [tag] of html.matchAll(/<(?:img|source|video|audio)\b[^>]*>/gi)) {
    found.push(toFile(attribute(tag, "src"), file));
    // Only the largest srcset candidate counts: a browser loads one of them.
    const srcset = attribute(tag, "srcset");
    if (srcset) found.push(toFile(srcset.split(",").at(-1)?.trim().split(/\s+/)[0], file));
  }
  return found.filter(Boolean);
}

async function cssResources(cssFile) {
  const css = await readFile(cssFile, "utf8").catch(() => "");
  return [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => toFile(m[1], cssFile)).filter(Boolean);
}

const pages = (await walk(dist)).filter((file) => file.endsWith(".html"));
if (pages.length === 0) {
  console.error("page weight: no HTML pages in dist/. Run `astro build` first.");
  process.exit(1);
}

const report = [];
for (const page of pages) {
  const html = await readFile(page, "utf8");
  const files = new Set(pageResources(html, page));
  for (const file of [...files]) {
    if (extname(file) === ".css") for (const nested of await cssResources(file)) files.add(nested);
  }
  let total = Buffer.byteLength(html);
  let javascript = 0;
  for (const file of files) {
    const bytes = await size(file);
    total += bytes;
    if ([".js", ".mjs"].includes(extname(file))) javascript += bytes;
  }
  report.push({ page: `/${relative(dist, page).split(sep).join("/")}`, totalBytes: total, javascriptBytes: javascript });
}

report.sort((a, b) => b.totalBytes - a.totalBytes);
const over = report.filter((r) => r.totalBytes > config.totalKb * KB || r.javascriptBytes > config.javascriptKb * KB);
const average = Math.round(report.reduce((sum, r) => sum + r.totalBytes, 0) / report.length);

await writeFile(
  join(rootDir, "page-weight-report.json"),
  `${JSON.stringify({ limits: config, averageBytes: average, pages: report }, null, 2)}\n`,
);

const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;
console.log(`page weight: ${report.length} pages, average ${kb(average)}, heaviest ${report[0].page} at ${kb(report[0].totalBytes)}.`);
console.log(`page weight: limits ${config.totalKb} KB per page, ${config.javascriptKb} KB of JavaScript.`);
if (over.length > 0) {
  for (const r of over) {
    console.error(`page weight: ${r.page} is over: ${kb(r.totalBytes)} in total, ${kb(r.javascriptBytes)} of JavaScript.`);
  }
  process.exit(1);
}
