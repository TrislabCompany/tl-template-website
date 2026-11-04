// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import site, { languages } from "./src/site.config";

// With two or more languages every page lives under its language (/en/,
// /sl/), and "/" leads to the default one. With one language there is no
// prefix and no redirect. src/i18n/index.ts follows the same rule.
const prefixed = languages.length > 1;
const root = `${site.url}/`;
const languageHomes = new Set(languages.map((lang) => `${site.url}/${lang}/`));

/** @param {string} url */
function canonical(url) {
  if (url === root || (prefixed && languageHomes.has(url))) return url;
  return url.replace(/\/+$/, "");
}

// output: "static" writes plain files to dist/, which nginx serves. Keep it:
// the image has no server code.
export default defineConfig({
  output: "static",
  site: site.url,
  redirects: prefixed ? { "/": `/${site.defaultLanguage}/` } : {},
  integrations: [
    // sitemap-index.xml with every page in every language, and the other
    // languages of each page as alternates.
    sitemap({
      filter: (page) => !(prefixed && page === root),
      // Same addresses as the canonical links: no trailing slash, except the
      // home page of each language ("/en/").
      serialize: (item) => ({
        ...item,
        url: canonical(item.url),
        links: item.links?.map((link) => ({ ...link, url: canonical(link.url) })),
      }),
      i18n: prefixed
        ? {
            defaultLocale: site.defaultLanguage,
            locales: Object.fromEntries(languages.map((lang) => [lang, lang])),
          }
        : undefined,
    }),
  ],
  build: {
    // Styles and scripts go to files under /_astro/, never inline, so the
    // Content-Security-Policy in nginx/default.conf needs no 'unsafe-inline'.
    inlineStylesheets: "never",
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
