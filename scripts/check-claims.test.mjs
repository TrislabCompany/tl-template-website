// Unit tests for the claims check, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { test } from "node:test";
import { analyticsEndpoint, analyticsOf, connectSources, directiveSources, publishedFigures, scriptsIn, unexpectedScripts } from "./check-claims.mjs";

test("JSON-LD is data, every other script counts", () => {
  assert.deepEqual(scriptsIn('<script type="application/ld+json">{}</script><p>x</p>'), []);
  assert.deepEqual(scriptsIn('<script type="module" src="/_astro/a.js"></script>'), ['<script type="module" src="/_astro/a.js">']);
  assert.deepEqual(scriptsIn("<SCRIPT>alert(1)</SCRIPT>"), ["<SCRIPT>"]);
});

test("reads the published figures, with a decimal point or comma", () => {
  assert.deepEqual(publishedFigures("| Weight | about 145 KB |\n| CO2 | about 0.02 g CO₂e |"), { kb: 145, grams: 0.02 });
  assert.deepEqual(publishedFigures("| Peso | circa 145 KB |\n| CO2 | circa 0,02 g CO₂e |"), { kb: 145, grams: 0.02 });
  assert.deepEqual(publishedFigures("no figures"), { kb: undefined, grams: undefined });
});

test("the analytics script is allowed only on a page with analytics", () => {
  const meta = '<meta name="analytics" data-provider="plausible" data-host="www.example.com" data-domain="example.com" data-endpoint="https://plausible.io/api/event">';
  const script = '<script type="module" src="/_astro/Analytics.astro_astro_type_script_index_0_lang.X.js"></script>';
  assert.equal(analyticsEndpoint(meta), "https://plausible.io/api/event");
  assert.equal(analyticsEndpoint("<p>x</p>"), undefined);
  assert.deepEqual(unexpectedScripts(meta + script), []);
  assert.equal(unexpectedScripts(script).length, 1);
  assert.equal(unexpectedScripts(meta + script + '<script type="module" src="/_astro/Other.js"></script>').length, 1);
});

test("reads connect-src from the headers file", () => {
  const headers = "/*\n  Content-Security-Policy: default-src 'self'; connect-src 'self' https://plausible.io; object-src 'none'\n";
  assert.deepEqual(connectSources(headers), ["'self'", "https://plausible.io"]);
  assert.deepEqual(connectSources("/*\n  X-Frame-Options: DENY\n"), []);
});

test("the Cloudflare beacon is added by the analytics script, never as a script tag of the page", () => {
  const meta = '<meta name="analytics" data-provider="cloudflare" data-host="www.example.com" data-domain="" data-endpoint="https://cloudflareinsights.com/cdn-cgi/rum" data-token="abc" data-beacon="https://static.cloudflareinsights.com/beacon.min.js">';
  const script = '<script type="module" src="/_astro/Analytics.astro_astro_type_script_index_0_lang.X.js"></script>';
  assert.deepEqual(analyticsOf(meta), { provider: "cloudflare", endpoint: "https://cloudflareinsights.com/cdn-cgi/rum", beacon: "https://static.cloudflareinsights.com/beacon.min.js" });
  assert.equal(analyticsOf("<p>x</p>"), undefined);
  assert.deepEqual(unexpectedScripts(meta + script), []);
  assert.equal(unexpectedScripts(meta + '<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script>').length, 1);
});

test("reads script-src and connect-src from the headers file", () => {
  const headers = "/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; object-src 'none'\n";
  assert.deepEqual(directiveSources(headers, "script-src"), ["'self'", "https://static.cloudflareinsights.com"]);
  assert.deepEqual(connectSources(headers), ["'self'", "https://cloudflareinsights.com"]);
  assert.deepEqual(directiveSources("/*\n  X-Frame-Options: DENY\n", "script-src"), []);
});
