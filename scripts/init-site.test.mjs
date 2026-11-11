import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { contrast, InitError, initSite, lighthouseUrls, patchAgents, patchI18n, patchTokens, readTokens, schemaErrors, semanticErrors, brandOf } from "./init-site.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(join(repo, "site.schema.json"), "utf8"));
const sampleYaml = readFileSync(join(repo, "scripts/init/sample-site.yaml"), "utf8");
const sample = () => parse(sampleYaml);
const tokens = readFileSync(join(repo, "src/styles/tokens.css"), "utf8");
const NOW = new Date("2026-11-10T12:00:00Z");

/** A copy of the template's files in a temporary folder, with the site.yaml given. */
function fresh(site = sample()) {
  const dir = mkdtempSync(join(tmpdir(), "init-site-"));
  const skip = new Set([".git", "node_modules", "dist", ".astro", ".quality", ".wrangler", ".lighthouseci"]);
  cpSync(repo, dir, { recursive: true, filter: (src) => !skip.has(src.split(/[\\/]/).at(-1)) });
  writeFileSync(join(dir, "site.yaml"), typeof site === "string" ? site : JSON.stringify(site));
  return dir;
}
const read = (dir, file) => readFileSync(join(dir, file), "utf8");
const run = (site, options) => {
  const dir = fresh(site);
  try {
    return { dir, plan: initSite({ root: dir, now: NOW, ...options }) };
  } catch (error) {
    return { dir, error };
  }
};
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true });

test("the sample site.yaml files are valid", () => {
  for (const file of readdirSync(join(repo, "scripts/init")).filter((f) => /^sample-site.*\.yaml$/.test(f))) {
    const site = parse(readFileSync(join(repo, "scripts/init", file), "utf8"));
    assert.deepEqual(schemaErrors(site, schema), [], file);
    assert.deepEqual(semanticErrors(site, tokens), [], file);
  }
});

test("schema: a missing field, an unknown field and a bad value are named", () => {
  const site = sample();
  delete site.domain;
  site.budget = { max: 1 };
  site.languages = ["sl", "xx"];
  site.contact.security_email = "not-an-address";
  const text = schemaErrors(site, schema).join("\n");
  assert.match(text, /"domain" is required/);
  assert.match(text, /"budget" is not a field of site.yaml/);
  assert.match(text, /languages\.1/);
  assert.match(text, /contact\.security_email/);
});

test("schema: at least one list is required", () => {
  const site = sample();
  site.collections = [];
  assert.match(schemaErrors(site, schema).join(" | "), /collections: must NOT have fewer than 1 items/);
  delete site.collections;
  assert.match(schemaErrors(site, schema).join(" | "), /"collections" is required/);
});

test("schema: no personal data or prices have a field to go in", () => {
  const site = sample();
  site.contact.phone = "+386 0";
  site.company.price = "1";
  const text = schemaErrors(site, schema).join("\n");
  assert.match(text, /"phone" is not a field/);
  assert.match(text, /"price" is not a field/);
});

test("rules: every text needs exactly the site's languages", () => {
  const site = sample();
  delete site.description.de;
  site.collections[0].title.hr = "Usluge";
  const text = semanticErrors(site, tokens).join("\n");
  assert.match(text, /description: needs exactly the languages sl, en, de/);
  assert.match(text, /collections\.0\.title: needs exactly/);
});

test("rules: reserved and repeated list ids", () => {
  const site = sample();
  site.collections.push({ ...site.collections[0] }, { ...site.collections[0], id: "contact" });
  const text = semanticErrors(site, tokens).join("\n");
  assert.match(text, /"services" is listed twice/);
  assert.match(text, /"contact" is an address the template already uses/);
});

test("rules: the brand needs the contrast tokens.css asks for", () => {
  const site = sample();
  site.theme = { accent_contrast: "#cccccc", accent: "#dddddd" };
  assert.match(semanticErrors(site, tokens).join("\n"), /accent_contrast #cccccc on accent #dddddd has contrast 1\.\d\d:1/);
  assert.ok(contrast("#000000", "#ffffff") > 20.9);
});

test("tokens: only the brand values change", () => {
  const brand = brandOf({ theme: { accent: "#14532d", accent_text: "#14532d" } }, tokens);
  const out = patchTokens(tokens, brand);
  assert.equal(readTokens(out).accent, "#14532d");
  assert.equal(readTokens(out).text, readTokens(tokens).text);
  assert.match(out, /@font-face/);
  assert.doesNotMatch(out, /neutral sample/);
  assert.doesNotMatch(out, /6\.6:1/);
});

test("language packs: the imports and the map follow the languages, en stays", () => {
  const out = patchI18n(read(repo, "src/i18n/index.ts"), ["sl", "de"]);
  assert.match(out, /import de from "\.\/ui\/de";/);
  assert.match(out, /import en, /);
  assert.doesNotMatch(out, /ui\/hr|ui\/it|ui\/sr/);
  assert.match(out, /= \{ en, sl, de \};/);
});

test("AGENTS.md: the header is replaced, the rest stays", () => {
  const out = patchAgents(read(repo, "AGENTS.md"), "# site\n\n> a site\n\n");
  assert.match(out, /^# site\n\n> a site\n\nThis file is the guide/);
  assert.throws(() => patchAgents("# x\n", "# y\n"), /This file is the guide/);
});

test("lighthouse pages: home of each language, then the default language's pages", () => {
  assert.deepEqual(lighthouseUrls(sample()), ["/sl", "/en", "/de", "/sl/about", "/sl/contact", "/sl/services", "/sl/sustainability"]);
  const one = { languages: ["sl"], collections: [{ id: "news" }], legal_pages: { sustainability: false } };
  assert.deepEqual(lighthouseUrls(one), ["/", "/about", "/contact", "/news"]);
});

test("init: deletes template-only and sample paths, writes the site's files", () => {
  const { dir, plan, error } = run(sample());
  try {
    assert.equal(error, undefined);
    for (const gone of ["site.yaml", "site.schema.json", "scripts/init-site.mjs", "scripts/init-site.test.mjs", "scripts/init", "template-manifest.yaml", "docs/template-releases.md", "src/content/services/en", ".agents/skills/release-template", ".github/workflows/template-release.yml", ".github/workflows/template-init.yml", "src/i18n/ui/hr.ts", "src/i18n/ui/it.ts", "src/i18n/ui/sr.ts"]) {
      assert.ok(!existsSync(join(dir, gone)), `${gone} should be deleted`);
    }
    assert.deepEqual(readdirSync(join(dir, "docs/upgrading")), ["README.md"]);
    for (const kept of ["src/i18n/ui/en.ts", "src/i18n/ui/sl.ts", "src/i18n/ui/de.ts", "scripts/check-template-manifest.mjs", ".agents/skills/release/SKILL.md", "src/content/services/.gitkeep"]) {
      assert.ok(existsSync(join(dir, kept)), `${kept} should stay`);
    }
    assert.ok(plan.deletions.includes("scripts/init-site.mjs"));

    assert.equal(read(dir, ".template-version"), "template: template-website\nversion: v0.4.0\ncommit: 0000000000000000000000000000000000000000\n");
    assert.equal(JSON.parse(read(dir, "package.json")).name, "example-website-corporate-site");
    assert.equal(JSON.parse(read(dir, "package.json")).scripts["init-site"], undefined);
    assert.match(read(dir, ".github/CODEOWNERS"), /^\* @ExampleOrg\/example-corporate-site\n\/\.github\/ @ExampleOrg\/example-corporate-site @ExampleOrg\/devops/);
    const config = read(dir, "src/site.config.ts");
    assert.match(config, /export const languages = \["sl", "en", "de"\] as const;/);
    assert.match(config, /url: "https:\/\/example\.com"/);
    assert.match(config, /defaultLanguage: "sl"/);
    assert.match(config, /contact: "mailto:security@example\.com"/);
    assert.match(config, /expires: "2027-11-05T12:00:00\.000Z"/);
    assert.match(read(dir, "src/content.config.ts"), /base: "\.\/src\/content\/services"/);
    assert.match(read(dir, "src/content.config.ts"), /export const collections = \{ services, legal \};/);
    assert.match(read(dir, "README.md"), /^# example-website-corporate-site/);
    assert.match(read(dir, "README.md"), /Slovenian, English, German/);
    assert.match(read(dir, "AGENTS.md"), /^# example-website-corporate-site/);
    assert.match(read(dir, "src/styles/tokens.css"), /--accent: #14532d;/);
    // Every language has its legal texts; the German one starts from the default language's draft.
    for (const lang of ["sl", "en", "de"]) assert.deepEqual(readdirSync(join(dir, "src/content/legal", lang)).sort(), ["accessibility.md", "privacy.md", "sustainability.md"]);
    assert.deepEqual(readdirSync(join(dir, "src/content/legal")).sort(), ["de", "en", "sl"]);
  } finally {
    cleanup(dir);
  }
});

test("init: a one-language site with a list that has a hyphen, and some legal pages off", () => {
  const site = sample();
  site.languages = ["en"];
  site.description = { en: site.description.en };
  site.contact.topics = [{ email: "info@example.com", label: { en: "General" } }];
  site.collections = [{ id: "news-items", title: { en: "News" }, lead: { en: "What is new." }, nav: false, home: false }];
  site.legal_pages = { accessibility: false };
  const { dir, error } = run(site);
  try {
    assert.equal(error, undefined);
    assert.match(read(dir, "src/content.config.ts"), /const newsItems = defineCollection/);
    assert.match(read(dir, "src/content.config.ts"), /export const collections = \{ "news-items": newsItems, legal \};/);
    assert.ok(existsSync(join(dir, "src/content/news-items/.gitkeep")));
    assert.ok(!existsSync(join(dir, "src/content/services")));
    assert.ok(!existsSync(join(dir, "src/content/legal/en/accessibility.md")));
    assert.ok(!existsSync(join(dir, "src/content/legal/sl")));
    assert.ok(!existsSync(join(dir, "src/i18n/ui/de.ts")) && existsSync(join(dir, "src/i18n/ui/en.ts")));
    assert.match(read(dir, "lighthouserc.json"), /"url": \["\/", "\/about", "\/contact", "\/news-items", "\/sustainability"\]/);
  } finally {
    cleanup(dir);
  }
});

test("init: a wrong site.yaml fails clearly and changes nothing", () => {
  const site = sample();
  delete site.name;
  site.budget = 5000;
  const { dir, error } = run(site);
  try {
    assert.ok(error instanceof InitError);
    assert.match(error.message, /"name" is required/);
    assert.match(error.message, /"budget" is not a field/);
    assert.ok(existsSync(join(dir, "site.yaml")) && existsSync(join(dir, "scripts/init-site.mjs")) && !existsSync(join(dir, ".template-version")));
  } finally {
    cleanup(dir);
  }
});

test("init: refuses an initialised repository, a missing site.yaml and invalid YAML", () => {
  let r = run(sample());
  assert.throws(() => initSite({ root: r.dir }), /manifest is missing|manifest/);
  cleanup(r.dir);

  const dir = fresh(sample());
  writeFileSync(join(dir, ".template-version"), "template: template-website\n");
  assert.throws(() => initSite({ root: dir, now: NOW }), /already initialised/);
  rmSync(join(dir, ".template-version"));
  rmSync(join(dir, "site.yaml"));
  assert.throws(() => initSite({ root: dir, now: NOW }), /site.yaml is missing/);
  writeFileSync(join(dir, "site.yaml"), "name: [unclosed");
  assert.throws(() => initSite({ root: dir, now: NOW }), /not valid YAML/);
  cleanup(dir);
});

test("init: --dry-run lists what would happen and changes nothing", () => {
  const { dir, plan } = run(sample(), { dryRun: true });
  try {
    assert.equal(plan.dryRun, true);
    assert.ok(plan.deletions.includes("src/content/services/en/first-service.md"));
    assert.ok(existsSync(join(dir, "site.yaml")) && !existsSync(join(dir, ".template-version")));
  } finally {
    cleanup(dir);
  }
});

test("the sample class holds the sample list", () => {
  const manifest = parse(readFileSync(join(repo, "template-manifest.yaml"), "utf8"));
  const samples = manifest.paths.filter((p) => p.ownership === "sample").map((p) => p.path);
  assert.deepEqual(samples, ["src/content/services/**", "src/assets/sample/**"]);
});
