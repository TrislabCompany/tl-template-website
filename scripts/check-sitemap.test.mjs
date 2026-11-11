// Unit tests for the sitemap check, run by `pnpm test` with the Node test runner.

import assert from "node:assert/strict";
import { test } from "node:test";
import { withDefaultLanguage, withoutUrls } from "../src/components/seo/sitemap.mjs";
import { fileOf, problems } from "./check-sitemap.mjs";

const O = "https://www.example.com";
const link = (lang, href) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`;
const url = (loc, alts = {}) => `<url><loc>${loc}</loc>${Object.entries(alts).map(([l, h]) => link(l, h)).join("")}</url>`;
const page = (canonical, alts = {}, noindex = false) =>
  `<html><head>${noindex ? '<meta name="robots" content="noindex">' : ""}${canonical ? `<link rel="canonical" href="${canonical}">` : ""}${Object.entries(alts)
    .map(([l, h]) => `<link rel="alternate" hreflang="${l}" href="${h}">`)
    .join("")}</head></html>`;
const alts = { en: `${O}/en`, sl: `${O}/sl`, "x-default": `${O}/en` };

function site(overrides = {}) {
  return {
    "robots.txt": `User-agent: *\nAllow: /\n\nSitemap: ${O}/sitemap-index.xml\n`,
    "sitemap-index.xml": `<sitemapindex><sitemap><loc>${O}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
    "sitemap-0.xml": `<urlset>${url(`${O}/en`, alts)}${url(`${O}/sl`, alts)}</urlset>`,
    "en.html": page(`${O}/en`, alts),
    "sl.html": page(`${O}/sl`, alts),
    "404.html": page(undefined, {}, true),
    ...overrides,
  };
}

test("a sitemap that matches its pages has no problems", () => {
  assert.deepEqual(problems(site()), []);
});

test("maps an address to its built file", () => {
  assert.equal(fileOf(`${O}/`, O), "index.html");
  assert.equal(fileOf(`${O}/en/about`, O), "en/about.html");
  assert.equal(fileOf("https://other.example/en", O), undefined);
});

test("robots.txt must name the sitemap", () => {
  assert.match(problems(site({ "robots.txt": "User-agent: *\nAllow: /\n" }))[0], /names no sitemap/);
});

test("a listed page that is missing, noindex or has another canonical is a problem", () => {
  assert.ok(problems(site({ "sl.html": undefined })).some((p) => p.includes("has no page")));
  assert.ok(problems(site({ "sl.html": page(`${O}/sl`, alts, true) })).some((p) => p.includes("marked noindex")));
  assert.ok(problems(site({ "sl.html": page(`${O}/en`, alts) })).some((p) => p.includes("canonical link is")));
});

test("an indexable page missing from the sitemap is a problem", () => {
  const found = problems(site({ "en/about.html": page(`${O}/en/about`) }));
  assert.ok(found.some((p) => p.includes("not in the sitemap")));
});

test("the alternates must match the page's, x-default included", () => {
  const noDefault = { en: `${O}/en`, sl: `${O}/sl` };
  const found = problems(site({ "sitemap-0.xml": `<urlset>${url(`${O}/en`, noDefault)}${url(`${O}/sl`, noDefault)}</urlset>` }));
  assert.ok(found.some((p) => p.includes("differ from the page's")));
});

test("addresses on another host are a problem", () => {
  const found = problems(site({ "sitemap-0.xml": `<urlset>${url(`${O}/en`, alts)}${url(`${O}/sl`, alts)}${url("https://staging.example.com/en")}</urlset>` }));
  assert.ok(found.some((p) => p.includes("is not on")));
});

test("x-default points at the default language, only with two or more languages", () => {
  const links = [
    { lang: "en", url: `${O}/en` },
    { lang: "sl", url: `${O}/sl` },
  ];
  assert.deepEqual(withDefaultLanguage(links, "en").at(-1), { lang: "x-default", url: `${O}/en` });
  assert.equal(withDefaultLanguage([links[0]], "en").length, 1);
  assert.equal(withDefaultLanguage(undefined, "en"), undefined);
});

test("takes the noindex addresses out of a sitemap", () => {
  const xml = `<urlset>${url(`${O}/en`)}${url(`${O}/en/draft`)}</urlset>`;
  assert.equal(withoutUrls(xml, new Set([`${O}/en/draft`])), `<urlset>${url(`${O}/en`)}</urlset>`);
});
