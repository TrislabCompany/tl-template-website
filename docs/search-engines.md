# Search engines

What the site tells search engines and social networks, what the checks hold it to, and what happens outside this repository (Google Search Console).

## 1. What every page says

`src/components/seo/SeoHead.astro` writes the head tags of every page, once, from `BaseLayout.astro`:

| Tag | From |
| --- | --- |
| `<title>` and `og:title` | The page's title and the site's name; for an item, its `searchTitle` when it has one |
| `<meta name="description">` and `og:description` | The page's description, or the site's (`description` in `src/site.config.ts`) |
| `<link rel="canonical">` and `og:url` | The page's own address on the production domain (`url`), without a trailing slash |
| `<link rel="alternate" hreflang>` | The page in every language it exists in, and `x-default` for the default language |
| `og:image`, its size and alt text, `twitter:card` | The share image (section 3) |
| `<meta name="robots" content="noindex">` | A page marked `noindex` (the 404 page, an item with `noindex: true`); such a page has no canonical link and is left out of the sitemap |

`src/components/seo/` is `shared` in `template-manifest.yaml`: a template release merges its changes into your copy. Put the site's own head tags in `BaseLayout.astro`, not in that folder.

## 2. robots.txt and the sitemap

- `/robots.txt` (`src/pages/robots.txt.ts`) lets search engines and AI answer engines in, keeps AI training crawlers out, and names the sitemap: `Sitemap: https://<domain>/sitemap-index.xml`.
- `/sitemap-index.xml` and `/sitemap-0.xml` follow the [sitemaps.org protocol](https://www.sitemaps.org/protocol.html), the format Google, Bing and the others read. Each address lists its other languages and `x-default` as `<xhtml:link rel="alternate" hreflang>`, the way [Google reads language versions in a sitemap](https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap). `astro.config.mjs` builds it with `@astrojs/sitemap` and `src/components/seo/sitemap.mjs`.
- The addresses use `url` from `src/site.config.ts`, the production domain, in every Environment. dev and staging are behind Cloudflare Access, so no search engine reads them.

`pnpm test` runs `scripts/check-sitemap.mjs` on the build. It fails when:

- robots.txt doesn't name the sitemap index, or names it on another address;
- a sitemap address isn't a built page, points to another host, isn't the page's canonical address, or is marked noindex;
- a page that can be indexed is missing from the sitemap;
- an address's language alternates differ from the page's own, or point to a page the sitemap doesn't list (an item marked `noindex` in only some of its languages: mark every language).

A sitemap that passes is one Search Console reads without errors.

## 3. Share image

The picture a social network or a chat shows with a link. Set the site's in `src/site.config.ts`:

```ts
import share from "./assets/share.jpg";
// …
shareImage: { src: share, alt: { en: "What the photo shows", sl: "Kaj prikazuje fotografija" } },
```

Any photo works: it is cropped to 1200 × 630 pixels (1.91:1) and saved as a JPEG at build. Keep the subject in the middle. A page can give its own with `image` on `BaseLayout`, and an item with `shareImage` and `shareImageAlt` in its front matter. Without any, a shared link shows no picture (`twitter:card` `summary`).

The share image isn't loaded by the page, so it doesn't count in the page-weight budget.

## 4. Search fields of an item

An item of a list (`src/content/<collection>/<language>/<name>.md`) may set, in its front matter:

| Field | What it does |
| --- | --- |
| `searchTitle` | The title in search results and when shared, when it should differ from the heading |
| `shareImage`, `shareImageAlt` | The item's share image, relative to the Markdown file, and what it shows |
| `noindex: true` | Keeps the item out of search engines and the sitemap; set it in every language of the item |

A collection gets these fields with `...seoFields(image)` in its schema in `src/content.config.ts`. A collection added before template-website v0.5.0 doesn't have them: add the line, as in the template's `services`.

## 5. Google Search Console

Search Console shows how the site does in Google search: indexed pages, errors and search terms. It needs nothing in this repository.

- **The property** is a domain property, `sc-domain:<domain>`, which covers every hostname and address of the domain. Trislab is always its owner. It is verified by a DNS TXT record, which the infrastructure repository keeps in its records of the domain and links in its domain catalog. Ask the platform team; never put a verification file or tag in this repository.
- **The sitemap** is submitted once production is public on the domain: `https://<domain>/sitemap-index.xml`. Google also finds it through robots.txt.
- **After a launch**, Trislab checks the property 4–6 weeks later: pages indexed, sitemap errors, redirects of the old addresses, and the search terms.

A page that answers with `X-Robots-Tag: noindex` or `<meta name="robots" content="noindex">` is never indexed, whatever the sitemap says. Since template-website v0.3.0 no build adds that header; a production deploy built before that release still does, until a newer release is promoted.
