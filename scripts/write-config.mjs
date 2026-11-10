// Prepares a built site (dist/) for one Environment, at deploy time, before
// `wrangler pages deploy`. The same build runs in every Environment; only these
// things differ:
//
// 1. dist/config.json: every setting whose name starts with PLATFORM_ or
//    PUBLIC_, and nothing else, so no secret reaches the browser. The site
//    reads it in src/lib/config.ts. Settings come from the environment of the
//    process, and from the JSON object in VARS_JSON: the workflows pass the
//    GitHub Environment's variables as VARS_JSON: ${{ toJSON(vars) }}.
// 2. Search engines (the protection rule, docs/deployment.md#search-engines).
//    A site is indexable only in production AND only when ROBOTS_INDEX is
//    "true". Everywhere else, always, whatever the variables say:
//      - X-Robots-Tag: noindex, nofollow on every path (dist/_headers),
//      - <meta name="robots" content="noindex, nofollow"> on every page,
//      - robots.txt with "Disallow: /",
//      - no sitemap: sitemap-index.xml and sitemap-N.xml are deleted.
//    The Environment is the PLATFORM_ENVIRONMENT of the process, which the
//    deploy workflow sets from the Environment it deploys to. A variable of
//    the GitHub Environment cannot change it, and a missing or unknown
//    Environment counts as not production.
//    An indexable site gets the header only on its *.pages.dev address.
// 3. In production only: the environment badge is taken out of every page, its
//    element and its script, so production pages load no JavaScript at all
//    and don't fetch /config.json (src/components/EnvironmentBadge.astro).
//
// Usage: node scripts/write-config.mjs [dist folder]

import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const NAME = /^(PLATFORM|PUBLIC)_[A-Za-z0-9_]+$/;

/** Every PLATFORM_* and PUBLIC_* setting, as strings, sorted by name. */
export function publicSettings(...sources) {
  const settings = {};
  for (const source of sources) {
    for (const [name, value] of Object.entries(source ?? {})) {
      if (NAME.test(name) && value !== undefined && value !== null) settings[name] = String(value);
    }
  }
  return Object.fromEntries(Object.entries(settings).sort(([a], [b]) => a.localeCompare(b)));
}

const ROBOTS = "  X-Robots-Tag: noindex, nofollow";

/**
 * _headers with the robots header added. Cloudflare Pages keeps only the last
 * rule of a path, so the header goes into the rule /* that is already there,
 * not into a second one. When the site may be indexed, only the *.pages.dev
 * address gets it, in a rule of its own.
 */
export function withRobots(headers, index) {
  const text = headers.replace(/\r\n/g, "\n");
  const ending = text.replace(/\n*$/, "\n");
  if (index) {
    return `${ending}\n# Added at deploy by scripts/write-config.mjs.\nhttps://:project.pages.dev/*\n${ROBOTS}\n`;
  }
  const lines = text.split("\n");
  const all = lines.indexOf("/*");
  if (all < 0) return `${text ? `${ending}\n` : ""}/*\n${ROBOTS}\n`;
  lines.splice(all + 1, 0, ROBOTS);
  return lines.join("\n");
}

const BADGE_ELEMENT = /<span\b[^>]*\bdata-environment\b[^>]*><\/span>/g;
const BADGE_SCRIPT = /<script\b[^>]*\bsrc="\/_astro\/EnvironmentBadge[^"]*"[^>]*><\/script>/g;

/** True only for the Environment named production. */
export function isProduction(environment) {
  return environment === "production";
}

/**
 * Whether search engines may index the site: only in production, and only when
 * ROBOTS_INDEX is "true". Nothing else makes a site indexable.
 */
export function indexable(environment, robotsIndex) {
  return isProduction(environment) && robotsIndex === "true";
}

const ROBOTS_META = '<meta name="robots" content="noindex, nofollow">';
const ANY_ROBOTS_META = /<meta\b[^>]*\bname=["']robots["'][^>]*>/gi;

/**
 * A page with exactly one robots meta tag: noindex, nofollow. It goes first in
 * the <head>. A page without a <head> (Astro's redirect page for "/") gets it
 * after its doctype and <html> tag; browsers and crawlers put it in the head.
 */
export function withNoindexMeta(html) {
  const out = html.replace(ANY_ROBOTS_META, "");
  const open = /<head\b[^>]*>/i.exec(out) ?? /<html\b[^>]*>/i.exec(out) ?? /<!doctype[^>]*>/i.exec(out);
  if (!open) throw new Error("a page has no <head>, <html> or doctype: it cannot get the robots meta tag");
  const at = open.index + open[0].length;
  return `${out.slice(0, at)}${ROBOTS_META}${out.slice(at)}`;
}

/** The robots.txt of a site that is not indexable. */
export const ROBOTS_TXT_CLOSED = "User-agent: *\nDisallow: /\n";

/** The files of the sitemap: sitemap-index.xml and sitemap-0.xml, sitemap-1.xml… */
export function isSitemapFile(name) {
  return /^sitemap(-index|-\d+)?\.xml$/.test(name);
}

/**
 * A page without the environment badge: its element and its script. Fails when
 * a trace of the badge is left, so a change to the component can't quietly
 * bring the script back to production.
 */
export function withoutBadge(html) {
  const out = html.replace(BADGE_SCRIPT, "").replace(BADGE_ELEMENT, "");
  if (/data-environment|EnvironmentBadge/.test(out)) {
    throw new Error("the environment badge is still in a page: update the patterns in scripts/write-config.mjs");
  }
  return out;
}

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".html")).map((entry) => join(entry.parentPath, entry.name));
}

export function parseVars(json) {
  if (!json) return {};
  const vars = JSON.parse(json);
  if (typeof vars !== "object" || vars === null || Array.isArray(vars)) {
    throw new Error("VARS_JSON must be a JSON object");
  }
  return vars;
}

/**
 * Prepares `dist` for an Environment and returns what it did. `env` is the
 * environment of the process; `vars` are the variables of the GitHub
 * Environment. The Environment's name comes from `env` only.
 */
export async function prepare(dist, { vars = {}, env = {} } = {}) {
  const settings = publicSettings(vars, env);
  const environment = env.PLATFORM_ENVIRONMENT;
  const robotsIndex = vars.ROBOTS_INDEX ?? env.ROBOTS_INDEX;
  const index = indexable(environment, robotsIndex);
  // The value on the screen is the one the process has, not a variable's.
  if (environment !== undefined) settings.PLATFORM_ENVIRONMENT = environment;
  else delete settings.PLATFORM_ENVIRONMENT;

  await writeFile(join(dist, "config.json"), `${JSON.stringify(settings)}\n`);
  const headersFile = join(dist, "_headers");
  const headers = await readFile(headersFile, "utf8").catch(() => "");
  await writeFile(headersFile, withRobots(headers, index));

  const pages = await htmlFiles(dist);
  if (!index) {
    for (const page of pages) await writeFile(page, withNoindexMeta(await readFile(page, "utf8")));
    await writeFile(join(dist, "robots.txt"), ROBOTS_TXT_CLOSED);
    const removed = (await readdir(dist)).filter(isSitemapFile);
    for (const name of removed) await rm(join(dist, name));
  }
  if (isProduction(environment)) {
    for (const page of pages) await writeFile(page, withoutBadge(await readFile(page, "utf8")));
  }
  return { settings, index, environment, pages: pages.length, badgeRemoved: isProduction(environment) };
}

async function main() {
  const dist = process.argv[2] ?? "dist";
  const vars = parseVars(process.env.VARS_JSON);
  const result = await prepare(dist, { vars, env: process.env });
  if (result.badgeRemoved) console.log(`environment badge: taken out of ${result.pages} pages`);
  console.log(`wrote ${join(dist, "config.json")}: ${Object.keys(result.settings).join(", ") || "(empty)"}`);
  const asked = (vars.ROBOTS_INDEX ?? process.env.ROBOTS_INDEX) === "true";
  console.log(
    `search engines: ${result.index ? "may index the site's own address" : "noindex everywhere"}` +
      (asked && !result.index ? " (ROBOTS_INDEX is ignored outside production)" : ""),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
