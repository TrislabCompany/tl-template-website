// Unit tests for the browser check's addresses, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { join, sep } from "node:path";
import { test } from "node:test";
import { fileFor, pathFor } from "./check-browser.mjs";

const posix = (path) => path.split(sep).join("/");

test("an address finds its file the way Cloudflare Pages does", () => {
  assert.equal(fileFor("/"), "index.html");
  assert.equal(fileFor("/en"), "en.html");
  assert.equal(posix(fileFor("/en/about")), "en/about.html");
  assert.equal(posix(fileFor("/_astro/a.css")), "_astro/a.css");
});

test("an address never leaves dist/", () => {
  assert.equal(fileFor("/../package.json"), "package.json");
  assert.equal(fileFor("/%2e%2e/%2e%2e/secret"), "secret.html");
});

test("a built page has the address it is served at", () => {
  assert.equal(pathFor("index.html"), "/");
  assert.equal(pathFor("en.html"), "/en");
  assert.equal(pathFor(join("en", "services", "first-service.html")), "/en/services/first-service");
});

test("reads the analytics tag of a built page, for either provider", async () => {
  const { analyticsOf } = await import("./check-browser.mjs");
  const plausible = '<meta name="analytics" data-provider="plausible" data-host="www.example.com" data-domain="example.com" data-endpoint="https://plausible.io/api/event">';
  assert.deepEqual(analyticsOf(plausible), { provider: "plausible", host: "www.example.com", domain: "example.com", endpoint: "https://plausible.io/api/event", token: undefined, beacon: undefined });
  const cloudflare = '<meta name="analytics" data-provider="cloudflare" data-host="www.example.com" data-domain="" data-endpoint="https://cloudflareinsights.com/cdn-cgi/rum" data-token="abc" data-beacon="https://static.cloudflareinsights.com/beacon.min.js">';
  assert.equal(analyticsOf(cloudflare).token, "abc");
  assert.equal(analyticsOf("<p>x</p>"), undefined);
});
