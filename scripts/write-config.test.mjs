// Unit tests for the deploy-time settings, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { isProduction, parseVars, publicSettings, withoutBadge } from "./write-config.mjs";

const script = fileURLToPath(new URL("write-config.mjs", import.meta.url));

test("keeps only PLATFORM_* and PUBLIC_* settings, as strings", () => {
  const settings = publicSettings(
    { PUBLIC_CONTACT_EMAIL: "info@example.com", CLOUDFLARE_ACCOUNT_ID: "x", PUBLIC_FLAG: true },
    { PLATFORM_ENVIRONMENT: "dev", PATH: "/bin", PUBLIC_: "no name", PLATFORM_x: "y", "PUBLIC_A-B": "no" },
  );
  assert.deepEqual(settings, {
    PLATFORM_ENVIRONMENT: "dev",
    PLATFORM_x: "y",
    PUBLIC_CONTACT_EMAIL: "info@example.com",
    PUBLIC_FLAG: "true",
  });
});

test("a later source wins", () => {
  assert.deepEqual(publicSettings({ PUBLIC_A: "1" }, { PUBLIC_A: "2" }), { PUBLIC_A: "2" });
});

test("VARS_JSON must be an object", () => {
  assert.deepEqual(parseVars(undefined), {});
  assert.deepEqual(parseVars('{"PUBLIC_A":"1"}'), { PUBLIC_A: "1" });
  assert.throws(() => parseVars("[1]"), /object/);
  assert.throws(() => parseVars("null"), /object/);
});

test("writes config.json and leaves _headers, robots.txt and the sitemap as built", () => {
  const dist = mkdtempSync(join(tmpdir(), "write-config-"));
  const files = { _headers: "/*\n  X-Frame-Options: DENY\n", "robots.txt": "User-agent: *\nAllow: /\n", "sitemap-index.xml": "<sitemapindex/>" };
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dist, name), text);
  execFileSync(process.execPath, [script, dist], {
    env: { PLATFORM_ENVIRONMENT: "staging", SECRET: "s", VARS_JSON: '{"PUBLIC_A":"1","ROBOTS_INDEX":"true"}' },
  });
  assert.deepEqual(JSON.parse(readFileSync(join(dist, "config.json"), "utf8")), {
    PLATFORM_ENVIRONMENT: "staging",
    PUBLIC_A: "1",
  });
  for (const [name, text] of Object.entries(files)) assert.equal(readFileSync(join(dist, name), "utf8"), text, name);
});

const page =
  '<head><script type="module" src="/_astro/EnvironmentBadge.astro_astro_type_script_index_0_lang.C7SnS5CW.js"></script></head>' +
  '<footer><span>© Example</span><span class="environment" data-environment hidden></span></footer>';

test("production pages lose the badge's element and script", () => {
  assert.equal(withoutBadge(page), "<head></head><footer><span>© Example</span></footer>");
  assert.equal(withoutBadge("<p>no badge</p>"), "<p>no badge</p>");
});

test("a badge the patterns miss fails the deploy", () => {
  assert.throws(() => withoutBadge('<span data-environment class="x" hidden>x</span>'), /still in a page/);
});

test("only production counts as production", () => {
  assert.ok(isProduction("production"));
  assert.ok(!isProduction("Production") && !isProduction("staging") && !isProduction("dev") && !isProduction(undefined));
});

test("a production deploy takes the badge out of every page, and dev and staging keep it", () => {
  for (const [environment, kept] of [["production", false], ["staging", true], ["dev", true]]) {
    const dist = mkdtempSync(join(tmpdir(), "write-config-"));
    mkdirSync(join(dist, "en"));
    writeFileSync(join(dist, "en.html"), page);
    writeFileSync(join(dist, "en", "about.html"), page);
    execFileSync(process.execPath, [script, dist], { env: { PLATFORM_ENVIRONMENT: environment } });
    for (const file of [join(dist, "en.html"), join(dist, "en", "about.html")]) {
      assert.equal(readFileSync(file, "utf8").includes("EnvironmentBadge"), kept, environment);
    }
  }
});

test("a variable of the GitHub Environment cannot make a deploy production or change its name", () => {
  const dist = mkdtempSync(join(tmpdir(), "write-config-"));
  writeFileSync(join(dist, "en.html"), page);
  execFileSync(process.execPath, [script, dist], {
    env: { PLATFORM_ENVIRONMENT: "staging", VARS_JSON: '{"PLATFORM_ENVIRONMENT":"production"}' },
  });
  assert.ok(readFileSync(join(dist, "en.html"), "utf8").includes("EnvironmentBadge"));
  assert.equal(JSON.parse(readFileSync(join(dist, "config.json"), "utf8")).PLATFORM_ENVIRONMENT, "staging");
});
