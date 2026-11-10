// Unit tests for the deploy-time settings, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  indexable,
  isProduction,
  isSitemapFile,
  parseVars,
  publicSettings,
  withNoindexMeta,
  withoutBadge,
  withRobots,
} from "./write-config.mjs";

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

const base = "/*\n  X-Frame-Options: DENY\n\n/_astro/*\n  Cache-Control: immutable\n";

test("noindex goes into the rule /* that is there, never a second one", () => {
  const headers = withRobots(base, false);
  assert.equal(headers.match(/^\/\*$/gm).length, 1);
  assert.match(headers, /^\/\*\n {2}X-Robots-Tag: noindex, nofollow\n {2}X-Frame-Options: DENY$/m);
  assert.ok(headers.endsWith("/_astro/*\n  Cache-Control: immutable\n"));
});

test("noindex adds a rule /* when there is none", () => {
  assert.equal(withRobots("", false), "/*\n  X-Robots-Tag: noindex, nofollow\n");
  assert.equal(withRobots("/a\n  X: y", false), "/a\n  X: y\n\n/*\n  X-Robots-Tag: noindex, nofollow\n");
});

test("an indexable site is noindex only on its pages.dev address", () => {
  const headers = withRobots(base, true);
  assert.ok(headers.startsWith(base));
  assert.match(headers, /^https:\/\/:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex, nofollow$/m);
  assert.equal(headers.match(/X-Robots-Tag/g).length, 1);
});

test("VARS_JSON must be an object", () => {
  assert.deepEqual(parseVars(undefined), {});
  assert.deepEqual(parseVars('{"PUBLIC_A":"1"}'), { PUBLIC_A: "1" });
  assert.throws(() => parseVars("[1]"), /object/);
  assert.throws(() => parseVars("null"), /object/);
});

test("writes config.json and adds noindex to _headers", () => {
  const dist = mkdtempSync(join(tmpdir(), "write-config-"));
  writeFileSync(join(dist, "_headers"), "/*\n  X-Frame-Options: DENY\n");
  execFileSync(process.execPath, [fileURLToPath(new URL("write-config.mjs", import.meta.url)), dist], {
    env: { PLATFORM_ENVIRONMENT: "staging", SECRET: "s", VARS_JSON: '{"PUBLIC_A":"1","ROBOTS_INDEX":"false"}' },
  });
  assert.deepEqual(JSON.parse(readFileSync(join(dist, "config.json"), "utf8")), {
    PLATFORM_ENVIRONMENT: "staging",
    PUBLIC_A: "1",
  });
  const headers = readFileSync(join(dist, "_headers"), "utf8");
  assert.equal(headers, "/*\n  X-Robots-Tag: noindex, nofollow\n  X-Frame-Options: DENY\n");
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
  assert.ok(!isProduction("prod") && !isProduction("Production") && !isProduction("staging") && !isProduction("dev") && !isProduction(undefined));
});

test("a production deploy takes the badge out of every page, and staging keeps it", () => {
  for (const [environment, kept] of [["production", false], ["staging", true]]) {
    const dist = mkdtempSync(join(tmpdir(), "write-config-"));
    mkdirSync(join(dist, "en"));
    writeFileSync(join(dist, "en.html"), page);
    writeFileSync(join(dist, "en", "about.html"), page);
    execFileSync(process.execPath, [fileURLToPath(new URL("write-config.mjs", import.meta.url)), dist], {
      env: { PLATFORM_ENVIRONMENT: environment },
    });
    for (const file of [join(dist, "en.html"), join(dist, "en", "about.html")]) {
      assert.equal(readFileSync(file, "utf8").includes("EnvironmentBadge"), kept);
    }
  }
});

// The protection rule: outside production nothing can make a site indexable.

test("only production with ROBOTS_INDEX=true is indexable", () => {
  assert.equal(indexable("production", "true"), true);
  assert.equal(indexable("production", "false"), false);
  assert.equal(indexable("production", undefined), false);
  assert.equal(indexable("production", "TRUE"), false);
  for (const environment of ["dev", "staging", "preview", "prod", "local", "", undefined]) {
    assert.equal(indexable(environment, "true"), false, String(environment));
  }
});

test("the robots meta tag replaces every other one and comes first in the head", () => {
  const html = '<html><head lang="x"><meta name="robots" content="index"><title>t</title><META NAME="robots" content="noindex"></head></html>';
  assert.equal(withNoindexMeta(html), '<html><head lang="x"><meta name="robots" content="noindex, nofollow"><title>t</title></head></html>');
  assert.equal(withNoindexMeta("<!doctype html><title>R</title>"), `<!doctype html>${"<meta name=\"robots\" content=\"noindex, nofollow\">"}<title>R</title>`);
  assert.throws(() => withNoindexMeta("<p>no head</p>"), /no <head>/);
});

test("the sitemap files are recognised", () => {
  for (const name of ["sitemap-index.xml", "sitemap-0.xml", "sitemap-12.xml", "sitemap.xml"]) assert.ok(isSitemapFile(name), name);
  for (const name of ["sitemap.html", "security.txt", "sitemap-x.xml"]) assert.ok(!isSitemapFile(name), name);
});


const built = (dir) => {
  mkdirSync(join(dir, "en"), { recursive: true });
  writeFileSync(join(dir, "_headers"), "/*\n  X-Frame-Options: DENY\n\n/_astro/*\n  Cache-Control: immutable\n");
  writeFileSync(join(dir, "en.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Home</title></head><body>x</body></html>');
  writeFileSync(join(dir, "en", "about.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="index,follow"></head><body>x</body></html>');
  writeFileSync(join(dir, "404.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"></head><body>x</body></html>');
  writeFileSync(join(dir, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: https://www.example.com/sitemap-index.xml\n");
  writeFileSync(join(dir, "sitemap-index.xml"), "<sitemapindex/>");
  writeFileSync(join(dir, "sitemap-0.xml"), "<urlset/>");
  writeFileSync(join(dir, "sitemap.html"), "<!doctype html><html><head></head><body>the sitemap page</body></html>");
};

const run = (environment, vars, extraEnv = {}) => {
  const dist = mkdtempSync(join(tmpdir(), "write-config-"));
  built(dist);
  execFileSync(process.execPath, [fileURLToPath(new URL("write-config.mjs", import.meta.url)), dist], {
    env: { ...(environment ? { PLATFORM_ENVIRONMENT: environment } : {}), VARS_JSON: JSON.stringify(vars), ...extraEnv },
  });
  return dist;
};

const files = (dist) => readdirSync(dist, { recursive: true }).map(String).map((f) => f.split(sep).join("/"));
const read = (dist, file) => readFileSync(join(dist, file), "utf8");

function assertClosed(dist) {
  assert.match(read(dist, "_headers"), /^\/\*\n {2}X-Robots-Tag: noindex, nofollow\n/);
  assert.doesNotMatch(read(dist, "_headers"), /pages\.dev/);
  assert.equal(read(dist, "robots.txt"), "User-agent: *\nDisallow: /\n");
  assert.deepEqual(files(dist).filter((f) => /^sitemap(-index|-\d+)?\.xml$/.test(f)), []);
  for (const page of files(dist).filter((f) => f.endsWith(".html"))) {
    const html = read(dist, page);
    assert.equal(html.match(/<meta name="robots"[^>]*>/g)?.length, 1, page);
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'), page);
  }
}

test("dev and staging are noindex, nofollow, whatever ROBOTS_INDEX says", () => {
  for (const environment of ["dev", "staging"]) {
    for (const vars of [{}, { ROBOTS_INDEX: "true" }, { ROBOTS_INDEX: "true", PLATFORM_ENVIRONMENT: "production" }]) {
      assertClosed(run(environment, vars));
    }
    assertClosed(run(environment, {}, { ROBOTS_INDEX: "true" }));
  }
});

test("a missing or unknown Environment is not production", () => {
  for (const environment of [undefined, "", "prod", "preview", "Production"]) {
    assertClosed(run(environment, { ROBOTS_INDEX: "true" }));
  }
});

test("a variable of the GitHub Environment cannot make a deploy production", () => {
  const dist = run("staging", { ROBOTS_INDEX: "true", PLATFORM_ENVIRONMENT: "production" });
  assertClosed(dist);
  assert.equal(JSON.parse(read(dist, "config.json")).PLATFORM_ENVIRONMENT, "staging");
});

test("production without ROBOTS_INDEX is closed too", () => {
  assertClosed(run("production", {}));
  assertClosed(run("production", { ROBOTS_INDEX: "false" }));
});

test("production with ROBOTS_INDEX=true keeps robots.txt and the sitemap, and is noindex only on pages.dev", () => {
  const dist = run("production", { ROBOTS_INDEX: "true" });
  assert.match(read(dist, "_headers"), /^https:\/\/:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex, nofollow$/m);
  assert.doesNotMatch(read(dist, "_headers"), /^\/\*\n {2}X-Robots-Tag/m);
  assert.match(read(dist, "robots.txt"), /Allow: \//);
  assert.ok(files(dist).includes("sitemap-index.xml") && files(dist).includes("sitemap-0.xml"));
  assert.ok(read(dist, "en/about.html").includes('content="index,follow"'));
});
