// `pnpm init-site`: turns a fresh copy of this template into one site's repository, once,
// in the repository's first PR (docs/getting-started.md#a-new-site).
//
//   pnpm init-site [path/to/site.yaml] [--dry-run]
//
// Input: site.yaml at the repository root, described by site.schema.json. The script
//   1. validates site.yaml against the schema and a few more rules, and changes nothing if it is wrong;
//   2. deletes every path of the manifest class `template-only` or `sample` (template-manifest.yaml);
//   3. writes src/site.config.ts, src/content.config.ts, src/styles/tokens.css (the brand values), README.md,
//      the header of AGENTS.md, .github/CODEOWNERS, the package name, lighthouserc.json and .template-version,
//      and drops the language packs and legal texts of languages the site doesn't have;
//   4. removes itself, its templates and site.yaml: they are template-only.
// After it, `pnpm install` and `pnpm test` pass. site.yaml holds published facts only.

import Ajv from "ajv";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "yaml";
import { ownershipOf } from "./check-template-manifest.mjs";

export const LANGUAGE_NAMES = { sl: "Slovenian", en: "English", hr: "Croatian", sr: "Serbian (Latin script)", it: "Italian", de: "German" };
/** Addresses and files the template already uses: a list of items can't take these ids. */
export const RESERVED_IDS = ["legal", "about", "contact", "imprint", "privacy", "accessibility", "sustainability", "sitemap", "404", "robots.txt", "config.json", "_astro", ".well-known"];
const BRAND = ["background", "surface", "surface_strong", "border", "text", "muted", "accent", "accent_text", "accent_contrast"];
const LEGAL = ["privacy", "accessibility", "sustainability"];
/** Folders that are never part of the repository's files. */
const SKIP = new Set([".git", "node_modules", "dist", ".astro", ".quality", ".wrangler", ".lighthouseci"]);

export class InitError extends Error {
  constructor(errors) {
    super(`init-site: ${errors.length} problem${errors.length === 1 ? "" : "s"}\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    this.errors = errors;
  }
}

// ---------------------------------------------------------------- validation

/** The errors of `site` against the JSON Schema, as readable lines. */
export function schemaErrors(site, schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (validate(site)) return [];
  return (validate.errors ?? []).map((e) => {
    const where = e.instancePath ? `site.yaml ${e.instancePath.slice(1).replaceAll("/", ".")}` : "site.yaml";
    if (e.keyword === "additionalProperties") return `${where}: "${e.params.additionalProperty}" is not a field of site.yaml (site.schema.json)`;
    if (e.keyword === "required") return `${where}: "${e.params.missingProperty}" is required`;
    if (e.keyword === "enum") return `${where}: ${e.message} (${e.params.allowedValues.join(", ")})`;
    if (e.keyword === "propertyNames") return `${where}: "${e.params.propertyName}" is not a language the template has (${Object.keys(LANGUAGE_NAMES).join(", ")})`;
    return `${where}: ${e.message}`;
  });
}

/** WCAG 2 relative luminance of "#rrggbb". */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The --custom-property values in the `:root` block of tokens.css, by name with hyphens ("surface-strong"). */
export function readTokens(css) {
  const root = (/:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
  return Object.fromEntries([...root.matchAll(/^\s*--([a-z-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
}

/** The brand colours: the template's, with the ones site.yaml sets. */
export function brandOf(site, tokensCss) {
  const base = readTokens(tokensCss);
  return Object.fromEntries(BRAND.map((key) => [key, (site.theme?.[key] ?? base[key.replaceAll("_", "-")] ?? "").toLowerCase()]));
}

/** Rules a JSON Schema can't say: the texts of every language, the ids, the contrast. */
export function semanticErrors(site, tokensCss) {
  const errors = [];
  const languages = site.languages ?? [];
  const want = [...languages].sort().join(",");
  const localized = (value, where) => {
    if (value && typeof value === "object" && [...Object.keys(value)].sort().join(",") !== want) {
      errors.push(`site.yaml ${where}: needs exactly the languages ${languages.join(", ")}, has ${Object.keys(value).join(", ")}`);
    }
  };
  localized(site.description, "description");
  (site.company?.imprint_notes ?? []).forEach((note, i) => localized(note, `company.imprint_notes.${i}`));
  (site.contact?.topics ?? []).forEach((topic, i) => localized(topic.label, `contact.topics.${i}.label`));
  const seen = new Set();
  (site.collections ?? []).forEach((collection, i) => {
    localized(collection.title, `collections.${i}.title`);
    localized(collection.lead, `collections.${i}.lead`);
    if (RESERVED_IDS.includes(collection.id)) errors.push(`site.yaml collections.${i}.id: "${collection.id}" is an address the template already uses`);
    if (seen.has(collection.id)) errors.push(`site.yaml collections.${i}.id: "${collection.id}" is listed twice`);
    seen.add(collection.id);
  });

  const brand = brandOf(site, tokensCss);
  if (BRAND.every((key) => /^#[0-9a-f]{6}$/.test(brand[key]))) {
    const need = [
      ["muted", "background"], ["muted", "surface"], ["accent_text", "background"], ["accent_text", "surface"],
      ["accent_contrast", "accent"], ["text", "background"], ["text", "surface"],
    ];
    for (const [fg, bg] of need) {
      const ratio = contrast(brand[fg], brand[bg]);
      if (ratio < 4.5) errors.push(`site.yaml theme: ${fg} ${brand[fg]} on ${bg} ${brand[bg]} has contrast ${ratio.toFixed(2)}:1; WCAG 2 AA needs 4.5:1`);
    }
  } else {
    errors.push("src/styles/tokens.css: could not read every brand token of :root; init-site needs --background, --surface, --surface-strong, --border, --text, --muted, --accent, --accent-text and --accent-contrast");
  }
  return errors;
}

// ------------------------------------------------------------------- writing

/** Replaces {{key}} in a template; an unknown key is an error, so a typo never reaches a file. */
export function fill(template, values, name = "template") {
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`${name} uses {{${key}}}, which init-site does not know`);
    return values[key];
  });
}

const json = (value) => JSON.stringify(value, null, 2);

/** The TypeScript object of src/site.config.ts. */
export function settingsOf(site, brand, now) {
  const expires = new Date(now.getTime() + 360 * 86_400_000).toISOString();
  const legal = { imprint: true, privacy: true, accessibility: true, sustainability: true, ...site.legal_pages };
  const { address } = site.company;
  const settings = {
    url: `https://${site.domain}`,
    name: site.name,
    description: site.description,
    languages: "__LANGUAGES__",
    defaultLanguage: site.languages[0],
    themeColor: (site.theme?.theme_color ?? brand.background).toLowerCase(),
    collections: (site.collections ?? []).map((c) => ({ id: c.id, title: c.title, lead: c.lead, nav: c.nav ?? true, home: c.home ?? true })),
    company: {
      name: site.company.name,
      legalName: site.company.legal_name,
      address: { street: address.street, postalCode: address.postal_code, city: address.city, country: address.country },
      ...(site.company.registration_number && { registrationNumber: site.company.registration_number }),
      ...(site.company.vat_id && { vatId: site.company.vat_id }),
      ...(site.company.imprint_notes && { imprintNotes: site.company.imprint_notes }),
      logo: "/favicon.svg",
      profiles: site.company.profiles ?? [],
    },
    contact: {
      topics: site.contact.topics.map((t) => ({ email: t.email, label: t.label })),
      ...(site.contact.map_url && { mapUrl: site.contact.map_url }),
      ...(site.contact.google_business_url && { googleBusinessUrl: site.contact.google_business_url }),
    },
    legalPages: legal,
    structuredData: site.structured_data ?? "Organization",
    securityTxt: { contact: `mailto:${site.contact.security_email}`, expires },
  };
  // Plain keys where TypeScript allows them, so the file reads like the template's own.
  return json(settings).replace('"__LANGUAGES__"', "languages").replace(/^(\s*)"([A-Za-z_]\w*)":/gm, "$1$2:");
}

export function siteConfigTs(template, site, brand, now) {
  return fill(template, { languages: JSON.stringify(site.languages).replaceAll(",", ", "), settings: settingsOf(site, brand, now) }, "site.config.ts.tmpl");
}

const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

export function contentConfigTs(template, itemTemplate, collections) {
  const items = collections.map((c) => fill(itemTemplate, { id_var: camel(c.id), id: c.id }, "item-collection.ts.tmpl")).join("\n");
  const names = collections.map((c) => (camel(c.id) === c.id ? c.id : `"${c.id}": ${camel(c.id)}`)).concat("").join(", ");
  return fill(template, { items, names }, "content.config.ts.tmpl");
}

/** tokens.css with the site's brand values in :root. The font rules and the rest stay as they are. */
export function patchTokens(css, brand) {
  let out = css.replace("The values are a neutral sample.", "The values were set by `pnpm init-site` from the site's brand; change them as the brand needs.");
  out = out.replace(/(:root\s*\{)([\s\S]*?)(\n\})/, (_, open, body, close) => {
    // The contrast notes of the sample colours no longer apply.
    body = body.replace(/\n\s*\/\*[^*]*:1[^*]*\*\//g, "");
    for (const key of BRAND) {
      const name = key.replaceAll("_", "-");
      body = body.replace(new RegExp(`^(\\s*--${name}:\\s*)[^;]+;`, "m"), `$1${brand[key]};`);
    }
    return open + body + close;
  });
  return out;
}

export function languageList(languages) {
  return languages.map((l) => LANGUAGE_NAMES[l]).join(", ");
}

/** The lines of src/i18n/index.ts without the packs of languages the site doesn't have (en stays: it defines the strings' type). */
export function patchI18n(text, languages) {
  const keep = new Set(["en", ...languages]);
  let out = text.replace(/^import (\w+) from "\.\/ui\/(\w+)";\r?\n/gm, (line, _name, code) => (keep.has(code) ? line : ""));
  out = out.replace(/(const ui: [^=]*=\s*)\{[^}]*\};/, (_, head) => `${head}{ ${["en", ...languages.filter((l) => l !== "en")].join(", ")} };`);
  return out;
}

/** The first line of AGENTS.md up to "This file is the guide" is replaced by the site's own header. */
export function patchAgents(text, header) {
  const at = text.search(/^This file is the guide/m);
  if (at < 0) throw new Error('AGENTS.md has no line starting "This file is the guide"; init-site replaces what comes before it');
  return header + text.slice(at);
}

export function lighthouseUrls(site) {
  const at = (lang, path) => (site.languages.length > 1 ? `/${lang}${path === "/" ? "" : path}` : path);
  const legal = { sustainability: true, ...site.legal_pages };
  const urls = site.languages.length > 1 ? site.languages.map((l) => `/${l}`) : ["/"];
  const lang = site.languages[0];
  urls.push(at(lang, "/about"), at(lang, "/contact"));
  for (const c of site.collections ?? []) urls.push(at(lang, `/${c.id}`));
  if (legal.sustainability) urls.push(at(lang, "/sustainability"));
  return urls;
}

// ----------------------------------------------------------------- the files

function walk(root, dir = root) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(root, path));
    else out.push(relative(root, path).split(sep).join("/"));
  }
  return out;
}

function pruneEmpty(dir, root) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !SKIP.has(entry.name)) pruneEmpty(join(dir, entry.name), root);
  }
  if (dir !== root && readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
}

/**
 * Runs the init in `root`. Everything is read and checked before the first file changes, so
 * a wrong site.yaml leaves the repository as it was. Returns what was done, for the log and the tests.
 * @param {{root?: string, siteFile?: string, now?: Date, dryRun?: boolean}} options
 */
export function initSite({ root = resolve(dirname(fileURLToPath(import.meta.url)), ".."), siteFile = "site.yaml", now = new Date(), dryRun = false } = {}) {
  const path = (p) => join(root, p);
  const read = (p) => readFileSync(path(p), "utf8");

  // 1. Preconditions and validation.
  const problems = [];
  if (existsSync(path(".template-version"))) problems.push(".template-version exists: this repository is already initialised");
  if (!existsSync(path("template-manifest.yaml"))) problems.push("template-manifest.yaml is missing: init-site runs once, on a fresh copy of the template");
  if (!existsSync(path("scripts/init"))) problems.push("scripts/init/ is missing: the templates of the files init-site writes");
  const siteFilePath = resolve(root, siteFile);
  if (!existsSync(siteFilePath)) problems.push(`${siteFile} is missing: write it from the site's intake (site.schema.json describes it)`);
  if (problems.length) throw new InitError(problems);

  let site;
  try {
    site = parse(readFileSync(siteFilePath, "utf8"));
  } catch (error) {
    throw new InitError([`${siteFile} is not valid YAML: ${error.message}`]);
  }
  if (!site || typeof site !== "object") throw new InitError([`${siteFile} is empty`]);
  const errors = schemaErrors(site, JSON.parse(read("site.schema.json")));
  if (errors.length) throw new InitError(errors);
  const tokensCss = read("src/styles/tokens.css");
  const more = semanticErrors(site, tokensCss);
  if (more.length) throw new InitError(more);

  // 2. Compute every new file.
  const manifest = parse(read("template-manifest.yaml"));
  const brand = brandOf(site, tokensCss);
  const [owner, repoName] = site.repo.split("/");
  const tpl = (name) => read(`scripts/init/${name}`);
  const collections = site.collections ?? [];
  const values = {
    name: site.name,
    domain: site.domain,
    repo_name: repoName,
    owner,
    team: site.github_team,
    template_version: site.template.version,
    language_list: languageList(site.languages),
    collection_sentence: collections.length ? `, and a list page and a page per item for ${collections.map((c) => `\`${c.id}\``).join(", ")}` : "",
  };
  const pkg = JSON.parse(read("package.json"));
  pkg.name = repoName;
  delete pkg.scripts?.["init-site"];
  const lighthouse = read("lighthouserc.json").replace(/("url":\s*)\[[^\]]*\]/, `$1[${lighthouseUrls(site).map((u) => JSON.stringify(u)).join(", ")}]`);

  /** @type {Record<string, string>} */
  const writes = {
    "src/site.config.ts": siteConfigTs(tpl("site.config.ts.tmpl"), site, brand, now),
    "src/content.config.ts": contentConfigTs(tpl("content.config.ts.tmpl"), tpl("item-collection.ts.tmpl"), collections),
    "src/styles/tokens.css": patchTokens(tokensCss, brand),
    "src/i18n/index.ts": patchI18n(read("src/i18n/index.ts"), site.languages),
    "README.md": fill(tpl("README.md.tmpl"), values, "README.md.tmpl"),
    "AGENTS.md": patchAgents(read("AGENTS.md"), fill(tpl("agents-header.md.tmpl"), values, "agents-header.md.tmpl")),
    ".github/CODEOWNERS": fill(tpl("CODEOWNERS.tmpl"), values, "CODEOWNERS.tmpl"),
    "package.json": `${json(pkg)}\n`,
    "lighthouserc.json": lighthouse,
    ".template-version": `template: ${manifest.template}\nversion: ${site.template.version}\ncommit: ${site.template.commit}\n`,
  };
  for (const c of collections) writes[`src/content/${c.id}/.gitkeep`] = "";

  // 3. What to delete: the manifest classes template-only and sample, the packs and texts of other languages.
  const files = walk(root);
  const deletions = files.filter((file) => ["template-only", "sample"].includes(ownershipOf(manifest, file)));
  const keep = new Set(["en", ...site.languages]);
  for (const file of files) {
    const pack = /^src\/i18n\/ui\/(\w+)\.ts$/.exec(file);
    if (pack && !keep.has(pack[1])) deletions.push(file);
    const legal = /^src\/content\/legal\/([a-z]{2})\/([a-z-]+)\.md$/.exec(file);
    if (legal && (!site.languages.includes(legal[1]) || (LEGAL.includes(legal[2]) && site.legal_pages?.[legal[2]] === false))) deletions.push(file);
  }
  // A language without a legal text gets the default language's (or English, or Slovenian) draft to translate.
  const copies = [];
  for (const lang of site.languages) {
    for (const page of LEGAL.filter((p) => site.legal_pages?.[p] !== false)) {
      if (files.includes(`src/content/legal/${lang}/${page}.md`)) continue;
      const from = [site.languages[0], "en", "sl"].find((l) => files.includes(`src/content/legal/${l}/${page}.md`));
      if (!from) throw new InitError([`there is no sample legal text src/content/legal/<language>/${page}.md to start ${lang} from`]);
      copies.push([`src/content/legal/${from}/${page}.md`, `src/content/legal/${lang}/${page}.md`]);
    }
  }
  const plan = { writes: Object.keys(writes), deletions: [...new Set(deletions)].sort(), copies };
  if (dryRun) return { ...plan, dryRun: true };

  // 4. Apply.
  for (const [from, to] of copies) {
    mkdirSync(dirname(path(to)), { recursive: true });
    cpSync(path(from), path(to));
  }
  for (const file of plan.deletions) rmSync(path(file), { force: true });
  for (const [file, text] of Object.entries(writes)) {
    mkdirSync(dirname(path(file)), { recursive: true });
    writeFileSync(path(file), text);
  }
  pruneEmpty(root, root);
  return plan;
}

function main(argv) {
  const dryRun = argv.includes("--dry-run");
  const siteFile = argv.find((a) => !a.startsWith("--")) ?? "site.yaml";
  try {
    const plan = initSite({ siteFile, dryRun });
    const verb = dryRun ? "would" : "did";
    console.log(`init-site: ${verb} write ${plan.writes.length} files, delete ${plan.deletions.length} (template-only and sample) and copy ${plan.copies.length} legal texts`);
    if (dryRun) for (const f of plan.deletions) console.log(`  delete ${f}`);
    else console.log("init-site: done. Run pnpm install and pnpm test, then commit the result as the first PR (branch init-site).");
  } catch (error) {
    console.error(error instanceof InitError ? error.message : `init-site: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
