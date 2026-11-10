import assert from "node:assert/strict";
import { test } from "node:test";
import { findChrome, lighthouseConfig, lighthouseMarkdown, onlyPages, pa11yConfig, rebase, sitemapLocs } from "./quality.mjs";

test("sitemapLocs reads every <loc>", () => {
  const xml = `<urlset><url><loc>https://www.example.com/en</loc><xhtml:link href="https://www.example.com/sl"/></url><url><loc> https://www.example.com/en/about </loc></url></urlset>`;
  assert.deepEqual(sitemapLocs(xml), ["https://www.example.com/en", "https://www.example.com/en/about"]);
});

test("rebase moves a URL to the local server and keeps the path", () => {
  assert.equal(rebase("https://www.example.com/en/about?x=1", "http://127.0.0.1:8788/"), "http://127.0.0.1:8788/en/about?x=1");
  assert.equal(rebase("/sl", "http://127.0.0.1:8788/"), "http://127.0.0.1:8788/sl");
});

test("pa11yConfig keeps the settings and adds the URLs", () => {
  const settings = { defaults: { standard: "WCAG2AA" } };
  assert.deepEqual(pa11yConfig(settings, ["http://a/"]), { defaults: { standard: "WCAG2AA" }, urls: ["http://a/"] });
});

test("lighthouseConfig resolves the pages and writes reports to the output folder", () => {
  const rc = { ci: { collect: { url: ["/en", "/en/contact"], numberOfRuns: 3 }, assert: { assertions: {} } } };
  const out = lighthouseConfig(rc, "http://127.0.0.1:8788/", ".quality/lighthouse");
  assert.deepEqual(out.ci.collect.url, ["http://127.0.0.1:8788/en", "http://127.0.0.1:8788/en/contact"]);
  assert.equal(out.ci.collect.numberOfRuns, 3);
  assert.deepEqual(out.ci.upload, { target: "filesystem", outputDir: ".quality/lighthouse" });
  assert.deepEqual(rc.ci.collect.url, ["/en", "/en/contact"], "the input is not changed");
});

test("findChrome prefers CHROME_PATH, then looks in the usual places", () => {
  assert.equal(findChrome({ CHROME_PATH: "/x/chrome" }, "linux", () => false), "/x/chrome");
  assert.equal(findChrome({}, "linux", (p) => p === "/usr/bin/chromium"), "/usr/bin/chromium");
  assert.equal(findChrome({}, "linux", () => false), undefined);
  assert.equal(findChrome({ PROGRAMFILES: "C:\\PF" }, "win32", (p) => p === "C:\\PF\\Google\\Chrome\\Application\\chrome.exe"), "C:\\PF\\Google\\Chrome\\Application\\chrome.exe");
});

test("lighthouseMarkdown marks each value against its limit", () => {
  const rc = {
    ci: {
      assert: {
        assertions: {
          "categories:performance": ["error", { minScore: 0.9 }],
          "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
          "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        },
      },
    },
  };
  const md = lighthouseMarkdown(
    [
      {
        url: "http://127.0.0.1:8788/en",
        scores: { performance: 0.98, accessibility: 1, "best-practices": 1, seo: 1 },
        metrics: { "largest-contentful-paint": 1234, "cumulative-layout-shift": 0.2, "total-blocking-time": 12.4, "first-contentful-paint": 900 },
      },
      { url: "http://127.0.0.1:8788/en/contact", scores: { performance: 0.895 }, metrics: {} },
    ],
    rc,
  );
  const [header, , en, contact] = md.split("\n");
  assert.equal(header, "| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | FCP |");
  assert.equal(en, "| /en | 98 ✅ | 100 | 100 | 100 | 1.2 s ✅ | 0.20 ❌ | 12 ms | 0.9 s |");
  // 0.895 shows as 90 but is under the limit of 0.9.
  assert.equal(contact, "| /en/contact | 90 ❌ | – | – | – | – | – | – | – |");
});

test("onlyPages keeps the URLs of the given paths, or all of them", () => {
  const urls = ["http://127.0.0.1:8788/en", "http://127.0.0.1:8788/en/about/", "http://127.0.0.1:8788/sl"];
  assert.deepEqual(onlyPages(urls, []), urls);
  assert.deepEqual(onlyPages(urls, ["/en/about", "/en/", "/de"]), urls.slice(0, 2));
});
