// Checks that the built sitemap is one search engines accept and that it says
// what the pages say (docs/search-engines.md). Run by `pnpm test` after the
// build, so ci runs it on every PR.
//
// - robots.txt names the sitemap index, at the site's own address.
// - sitemap-index.xml and every sitemap it lists are in the sitemaps.org format
//   (https://www.sitemaps.org/protocol.html): at most 50,000 addresses and
//   50 MB per file, absolute https addresses on the site's own host.
// - Every address in a sitemap is a built page that can be indexed: it has a
//   file in dist/, its canonical link is that same address, and it is not
//   marked noindex. A sitemap address that redirects, is missing or points
//   elsewhere is an error in Search Console.
// - Every page that can be indexed is in the sitemap.
// - The language alternates (<xhtml:link hreflang>) are the page's own
//   <link rel="alternate" hreflang>, x-default included, and each alternate is
//   itself in the sitemap.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const dist = join(rootDir, "dist");
const MAX_URLS = 50_000;
const MAX_BYTES = 50 * 1024 * 1024;

const all = (text, pattern) => [...text.matchAll(pattern)].map((match) => match[1]);

/** The <loc> of every <sitemap> of a sitemap index. */
export function indexLocations(xml) {
  return all(xml, /<sitemap>\s*<loc>([^<]+)<\/loc>/g);
}

/** Every <url> of a sitemap: its address and its alternates by language. */
export function sitemapEntries(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => ({
    loc: body.match(/<loc>([^<]+)<\/loc>/)?.[1],
    alternates: Object.fromEntries(
      [...body.matchAll(/<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/g)].map(([, lang, href]) => [lang, href]),
    ),
  }));
}

/** What a built page tells search engines: canonical, noindex and alternates. */
export function pageTags(html) {
  return {
    canonical: html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1],
    noindex: /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html),
    alternates: Object.fromEntries(
      [...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/gi)].map(([, lang, href]) => [lang, href]),
    ),
  };
}

/** The file in dist/ of an address on the site: /en/about is en/about.html, / is index.html. */
export function fileOf(url, origin) {
  const parsed = new URL(url);
  if (parsed.origin !== origin) return undefined;
  const path = decodeURIComponent(parsed.pathname);
  return path === "/" ? "index.html" : `${path.slice(1)}.html`;
}

const sameSet = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/**
 * Every problem of a built site's sitemap. `files` maps a path in dist/ (with
 * forward slashes) to its text; `sizes` maps a sitemap's path to its bytes.
 */
export function problems(files, sizes = {}) {
  const out = [];
  const robots = files["robots.txt"];
  const named = robots?.match(/^Sitemap:\s*(\S+)\s*$/m)?.[1];
  if (!named) return ["robots.txt names no sitemap (Sitemap: https://<domain>/sitemap-index.xml)"];
  const index = new URL(named);
  if (index.protocol !== "https:") out.push(`robots.txt names ${named}: a sitemap address must be https`);
  if (index.pathname !== "/sitemap-index.xml") out.push(`robots.txt names ${named}, not /sitemap-index.xml`);
  const origin = index.origin;
  const indexXml = files["sitemap-index.xml"];
  if (!indexXml) return [...out, "dist/sitemap-index.xml is missing"];

  const listed = new Map();
  for (const loc of indexLocations(indexXml)) {
    const name = fileOf(loc, origin)?.replace(/\.html$/, "");
    if (!name || !files[name]) {
      out.push(`sitemap-index.xml lists ${loc}, which is not a sitemap of this site`);
      continue;
    }
    const entries = sitemapEntries(files[name]);
    if (entries.length > MAX_URLS) out.push(`${name} has ${entries.length} addresses; the limit is ${MAX_URLS}`);
    if ((sizes[name] ?? 0) > MAX_BYTES) out.push(`${name} is over 50 MB`);
    for (const entry of entries) {
      if (!entry.loc) out.push(`${name} has an entry without <loc>`);
      else if (listed.has(entry.loc)) out.push(`${entry.loc} is in the sitemap twice`);
      else listed.set(entry.loc, entry);
    }
  }
  if (listed.size === 0) out.push("the sitemap lists no page");

  for (const [loc, entry] of listed) {
    if (!loc.startsWith(`${origin}/`)) {
      out.push(`${loc} is not on ${origin}`);
      continue;
    }
    const file = fileOf(loc, origin);
    const html = file && files[file];
    if (!html) {
      out.push(`${loc} is in the sitemap but has no page (dist/${file})`);
      continue;
    }
    const tags = pageTags(html);
    if (tags.noindex) out.push(`${loc} is in the sitemap but marked noindex`);
    if (tags.canonical !== loc) out.push(`${loc} is in the sitemap but its canonical link is ${tags.canonical ?? "missing"}`);
    if (!sameSet(entry.alternates, tags.alternates)) {
      out.push(`${loc}: the sitemap's alternates ${JSON.stringify(entry.alternates)} differ from the page's ${JSON.stringify(tags.alternates)}`);
    }
    for (const [lang, href] of Object.entries(entry.alternates)) {
      if (!listed.has(href)) out.push(`${loc}: its alternate ${lang} ${href} is not in the sitemap (is an item marked noindex in only some of its languages?)`);
    }
  }

  for (const [file, text] of Object.entries(files)) {
    if (!file.endsWith(".html") || text === undefined) continue;
    const tags = pageTags(text);
    if (tags.noindex || !tags.canonical) continue;
    if (!listed.has(tags.canonical)) out.push(`dist/${file} can be indexed (canonical ${tags.canonical}) but is not in the sitemap`);
  }
  return out;
}

async function main() {
  const entries = await readdir(dist, { withFileTypes: true, recursive: true });
  const files = {};
  const sizes = {};
  for (const entry of entries) {
    if (!entry.isFile() || !/\.(html|xml|txt)$/.test(entry.name)) continue;
    const full = join(entry.parentPath, entry.name);
    const name = relative(dist, full).split(sep).join("/");
    files[name] = await readFile(full, "utf8");
    if (name.endsWith(".xml")) sizes[name] = (await stat(full)).size;
  }
  const found = problems(files, sizes);
  if (found.length > 0) {
    for (const problem of found) console.error(`sitemap: ${problem}`);
    process.exit(1);
  }
  const pages = sitemapEntries(Object.entries(files).filter(([name]) => /^sitemap-\d+\.xml$/.test(name)).map(([, xml]) => xml).join(""));
  console.log(`sitemap: ok. ${pages.length} pages, each a built page with the same canonical address and language alternates, none marked noindex; robots.txt names it.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
