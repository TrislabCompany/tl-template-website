// Which steps of ci / ci a PR needs, from the files it changes (docs/quality-checks.md#what-runs-for-a-pr).
// A file that changes nothing on the site skips the checks; a content page limits
// accessibility and Lighthouse to the pages it shows on. A push to main, a change to
// the CI itself or a file not known here runs everything.
//   git diff --name-only --no-renames HEAD^1 HEAD | node scripts/ci-scope.mjs
//   node scripts/ci-scope.mjs --all
// Writes one key=value line per check, `any` and `pages` to $GITHUB_OUTPUT (or stdout),
// and what runs and why to the job summary.

import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The steps of ci / ci, in the order they run (checks.yml). */
export const CHECKS = ["template", "types", "lint", "unit", "build", "built", "a11y", "lighthouse"];

// Files that change neither the site nor a check.
const NOTHING = [
  /^docs\//,
  /^[^/]+\.md$/,
  /^\.(editorconfig|gitattributes|gitignore)$/,
  /^renovate\.json$/,
  /^\.github\/CODEOWNERS$/,
  /^\.github\/workflows\/(deploy-dev|deploy-staging|promote|release|pages-deploy)\.yml$/,
];

const SITE = /^(src|public)\//;
const SITE_FILES = ["astro.config.mjs", "package.json", "pnpm-lock.yaml", "tsconfig.json"];
// Any collection: a legal text, or the items of a list (collections in src/site.config.ts).
const CONTENT = /^src\/content\/([a-z0-9-]+)\/([a-z]{2})\/([^/]+)\.md$/;

/**
 * The pages a content file shows on: its own, and the lists that show its title.
 * With one language the addresses have no language prefix (src/i18n/index.ts).
 */
export function pagesOf(collection, lang, slug, prefixed = true) {
  const at = (path) => (prefixed ? `/${lang}${path === "/" ? "" : path}` : path);
  if (collection === "legal") return [at(`/${slug}`), at("/sitemap")];
  return [at(`/${collection}/${slug}`), at(`/${collection}`), at("/"), at("/sitemap")];
}

/** True when the site has two or more languages, read from src/site.config.ts. */
export function isPrefixed(configText) {
  const list = /export const languages = \[([^\]]*)\]/.exec(configText)?.[1] ?? "";
  return list.split(",").filter((code) => code.trim()).length > 1;
}

/** The checks one changed file needs; `pages` limits accessibility and Lighthouse to those pages. */
export function checksFor(file, { prefixed = true } = {}) {
  const content = CONTENT.exec(file);
  if (content) return { checks: ["types", "build", "built", "a11y", "lighthouse"], pages: pagesOf(...content.slice(1), prefixed) };
  // The agent files and the template's own manifest: only the manifest check reads them.
  if (file === "AGENTS.md" || file === "template-manifest.yaml" || /^\.(agents|claude)\//.test(file)) return { checks: ["template"] };
  if (NOTHING.some((r) => r.test(file))) return { checks: [] };
  if (SITE.test(file) || SITE_FILES.includes(file)) return { checks: CHECKS };
  if (file === "eslint.config.js") return { checks: ["lint"] };
  if (file === ".template-version" || file === "scripts/check-template-manifest.mjs") return { checks: ["template", "lint", "unit"] };
  if (/^scripts\/check-(page-weight|security-txt|claims|browser)\.mjs$/.test(file) || file === "page-weight.config.json") {
    return { checks: ["lint", "unit", "build", "built"] };
  }
  if (file === "scripts/quality.mjs") return { checks: ["lint", "unit", "build", "a11y", "lighthouse"] };
  // write-config.mjs prepares every deploy and the copy quality.mjs serves.
  if (file === "scripts/write-config.mjs") return { checks: ["lint", "unit", "build", "built", "a11y", "lighthouse"] };
  if (file === ".pa11yci.json") return { checks: ["build", "a11y"] };
  if (file === "lighthouserc.json") return { checks: ["build", "lighthouse"] };
  if (/^scripts\/[^/]+\.mjs$/.test(file)) return { checks: ["lint", "unit"] };
  // The CI itself (ci.yml, checks.yml, .github/actions/) or a file not known here.
  return { checks: CHECKS };
}

/**
 * The checks for a set of changed files: { checks: {name: bool}, pages: [] }.
 * `pages` empty means every page.
 */
export function scope(files, options) {
  const checks = new Set();
  const pages = new Set();
  let allPages = false;
  for (const file of files) {
    const r = checksFor(file, options);
    r.checks.forEach((c) => checks.add(c));
    if (r.checks.includes("a11y") || r.checks.includes("lighthouse")) {
      if (r.pages) r.pages.forEach((p) => pages.add(p));
      else allPages = true;
    }
  }
  return { checks: Object.fromEntries(CHECKS.map((c) => [c, checks.has(c)])), pages: allPages ? [] : [...pages].sort() };
}

function main() {
  const all = process.argv.includes("--all");
  const files = all ? [] : readFileSync(0, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  const prefixed = isPrefixed(readFileSync("src/site.config.ts", "utf8"));
  const result = all ? { checks: Object.fromEntries(CHECKS.map((c) => [c, true])), pages: [] } : scope(files, { prefixed });

  const any = Object.values(result.checks).some(Boolean);
  const lines = [...Object.entries(result.checks).map(([c, on]) => `${c}=${on}`), `any=${any}`, `pages=${result.pages.join(" ")}`];
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
  else console.log(lines.join("\n"));

  const on = CHECKS.filter((c) => result.checks[c]);
  const off = CHECKS.filter((c) => !result.checks[c]);
  const note =
    `### What runs\n\n` +
    (all ? "Every check: this is a push to main.\n" : `${files.length} changed files.\n`) +
    `\n- **Runs:** ${on.join(", ") || "nothing, the PR changes nothing the checks look at"}\n` +
    (off.length ? `- **Skipped:** ${off.join(", ")}\n` : "") +
    (any && (result.checks.a11y || result.checks.lighthouse)
      ? `- **Pages for accessibility and Lighthouse:** ${result.pages.length ? result.pages.join(", ") : "all"}\n`
      : "");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, note + "\n");
  console.log(note);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
