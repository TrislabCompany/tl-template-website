// Prepares a built site (dist/) for one Environment, at deploy time, before
// `wrangler pages deploy`. The same build runs in every Environment; only these
// two things differ:
//
// 1. dist/config.json: every setting whose name starts with PLATFORM_ or
//    PUBLIC_, and nothing else, so no secret reaches the browser. The site
//    reads it in src/lib/config.ts. Settings come from the environment of the
//    process, and from the JSON object in VARS_JSON: the workflows pass the
//    GitHub Environment's variables as VARS_JSON: ${{ toJSON(vars) }}.
// 2. In production only: the environment badge is taken out of every page, its
//    element and its script, so production pages load no JavaScript at all
//    and don't fetch /config.json (src/components/EnvironmentBadge.astro).
//
// robots.txt, the sitemap and the headers are the same in every Environment.
// dev and staging are kept from the public by Cloudflare Access, which the
// infrastructure enforces (docs/deployment.md#environments).
//
// Usage: node scripts/write-config.mjs [dist folder]

import { readdir, readFile, writeFile } from "node:fs/promises";
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

const BADGE_ELEMENT = /<span\b[^>]*\bdata-environment\b[^>]*><\/span>/g;
const BADGE_SCRIPT = /<script\b[^>]*\bsrc="\/_astro\/EnvironmentBadge[^"]*"[^>]*><\/script>/g;

/** True only for the Environment named production. */
export function isProduction(environment) {
  return environment === "production";
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
 * Environment. The Environment's name comes from `env` only, so a variable
 * cannot make a deploy look like production (the badge) or the reverse.
 */
export async function prepare(dist, { vars = {}, env = {} } = {}) {
  const settings = publicSettings(vars, env);
  const environment = env.PLATFORM_ENVIRONMENT;
  if (environment !== undefined) settings.PLATFORM_ENVIRONMENT = environment;
  else delete settings.PLATFORM_ENVIRONMENT;

  await writeFile(join(dist, "config.json"), `${JSON.stringify(settings)}
`);

  const pages = await htmlFiles(dist);
  if (isProduction(environment)) {
    for (const page of pages) await writeFile(page, withoutBadge(await readFile(page, "utf8")));
  }
  return { settings, environment, pages: pages.length, badgeRemoved: isProduction(environment) };
}

async function main() {
  const dist = process.argv[2] ?? "dist";
  const vars = parseVars(process.env.VARS_JSON);
  const result = await prepare(dist, { vars, env: process.env });
  if (result.badgeRemoved) console.log(`environment badge: taken out of ${result.pages} pages`);
  console.log(`wrote ${join(dist, "config.json")}: ${Object.keys(result.settings).join(", ") || "(empty)"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
