import assert from "node:assert/strict";
import { test } from "node:test";
import { CHECKS, checksFor, isPrefixed, scope } from "./ci-scope.mjs";

const on = (result) => CHECKS.filter((c) => result.checks[c]);

test("docs and repository settings run nothing", () => {
  const r = scope(["docs/deployment.md", "README.md", "renovate.json", ".github/workflows/release.yml"]);
  assert.deepEqual(on(r), []);
});

test("a site file runs everything on every page", () => {
  const r = scope(["docs/x.md", "src/components/Footer.astro"]);
  assert.deepEqual(on(r), CHECKS);
  assert.deepEqual(r.pages, []);
});

test("a content page limits accessibility and Lighthouse to the pages it shows on", () => {
  const r = scope(["src/content/legal/sl/privacy.md", "src/content/services/en/first-service.md"]);
  assert.deepEqual(on(r), ["types", "build", "built", "a11y", "lighthouse"]);
  assert.deepEqual(r.pages, ["/en", "/en/services", "/en/services/first-service", "/en/sitemap", "/sl/privacy", "/sl/sitemap"]);
});

test("a content page next to a site file checks every page", () => {
  assert.deepEqual(scope(["src/content/legal/en/privacy.md", "src/styles/global.css"]).pages, []);
});

test("scripts run lint and unit tests, and the checks they implement", () => {
  assert.deepEqual(on(scope(["scripts/version.mjs"])), ["lint", "unit"]);
  assert.deepEqual(on(scope(["scripts/check-browser.test.mjs"])), ["lint", "unit"]);
  assert.deepEqual(on(scope(["scripts/check-browser.mjs"])), ["lint", "unit", "build", "built"]);
  assert.deepEqual(on(scope(["lighthouserc.json"])), ["build", "lighthouse"]);
  assert.deepEqual(on(scope([".pa11yci.json"])), ["build", "a11y"]);
});

test("the CI itself and unknown files run everything", () => {
  assert.deepEqual(checksFor(".github/workflows/checks.yml").checks, CHECKS);
  assert.deepEqual(checksFor(".github/actions/setup/action.yml").checks, CHECKS);
  assert.deepEqual(checksFor("something-new.yaml").checks, CHECKS);
});

test("write-config runs every check that sees its output", () => {
  assert.deepEqual(on(scope(["scripts/write-config.mjs"])), ["lint", "unit", "build", "built", "a11y", "lighthouse"]);
});

test("any collection is a content page, whatever its name", () => {
  assert.deepEqual(scope(["src/content/news/sl/launch.md"]).pages, ["/sl", "/sl/news", "/sl/news/launch", "/sl/sitemap"]);
});

test("with one language the pages have no prefix", () => {
  const r = scope(["src/content/services/en/first-service.md", "src/content/legal/en/privacy.md"], { prefixed: false });
  assert.deepEqual(r.pages, ["/", "/privacy", "/services", "/services/first-service", "/sitemap"]);
});

test("the language list of the site settings tells whether the pages are prefixed", () => {
  assert.equal(isPrefixed('export const languages = ["en", "sl"] as const;'), true);
  assert.equal(isPrefixed('export const languages = ["en"] as const;'), false);
});

test("the agent files and the manifest only run the manifest check", () => {
  for (const file of ["AGENTS.md", "template-manifest.yaml", ".agents/skills/release/SKILL.md", ".claude/skills/release/SKILL.md"]) {
    assert.deepEqual(on(scope([file])), ["template"], file);
  }
});
