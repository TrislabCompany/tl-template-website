# template-website v0.5.0

Search engines and sharing: the head tags of every page move into a `shared` component, `src/components/seo/`, so later SEO fixes reach every site by a merge instead of a hand edit. A site can set a share image, an item can set a search title, a share image and `noindex`, the sitemap gets `x-default` and leaves out pages marked noindex, and `pnpm test` checks the sitemap. Also cookieless visit counts with Plausible, off unless a site sets `analytics` (D-21), and a site's own `public/_redirects` is kept when the build adds the redirect from `/`.

How it works: [search-engines.md](../search-engines.md) and [analytics.md](../analytics.md).

## Breaking

No. No path that products use is removed or renamed, no `docs/` heading that a skill links to changes, no skill is added or renamed, and no variable or secret of the GitHub Environments is new. `PUBLIC_ANALYTICS_ID` is no longer named in `docs/configuration.md`: no code ever read it, and visit counts are switched on in `src/site.config.ts`. Under `0.x` a feature is a minor version.

## Requires

Nothing new beyond v0.4.0. A site that switches on `analytics` needs a Plausible site of its own (docs/analytics.md); nothing in the infrastructure.

## Changes by ownership

### platform

Nothing.

### shared

- **`src/components/seo/`** (new, with a rule before `src/**`; #19): `SeoHead.astro` writes the description, title, canonical, hreflang with `x-default`, Open Graph, the share image (cropped to 1200 × 630 JPEG at build) and `twitter:card`; `fields.ts` has the search fields of an item (`seoFields`, `seoProps`); `types.ts` the `ShareImage` type; `sitemap.mjs` adds `x-default` to the sitemap's alternates and removes pages marked noindex.
- **`src/components/analytics/`** (new; #20): `Analytics.astro`, the Plausible page view, rendered only when the site sets `analytics` and sent only on the production host.
- **`astro.config.mjs`**: the sitemap uses `src/components/seo/sitemap.mjs` (#19); the site's own `public/_redirects` is kept after the 301 from `/` (#18).
- **`package.json`**: `check-sitemap.mjs` in `check:built`; the dependency `sharp` 0.35.5, which Astro needs to crop the share image (#19).
- **`scripts/check-sitemap.mjs`** and its tests (new; #19): robots.txt names the sitemap index; every sitemap address is a built page with the same canonical address and alternates, none noindex; every indexable page is listed.
- **`scripts/check-browser.mjs`, `scripts/check-claims.mjs`** and tests (#20): with `analytics`, the one analytics script is allowed, its endpoint must be in `connect-src` of `public/_headers` and the privacy policy of every language must name Plausible; on the production host one page view goes to the endpoint and nothing else. Without `analytics`, the checks are as before.
- **`AGENTS.md`**: the two shared folders in the layout table.
- **Docs**: `docs/search-engines.md` and `docs/analytics.md` (new); `docs/architecture.md` (the site's own redirects), `docs/configuration.md` (no `PUBLIC_ANALYTICS_ID`), `docs/getting-started.md` (the sitemap check), `docs/site-settings.md` ("Share image and search", "Visit counts").

### product

Shown as a suggestion only. Steps 2 to 4 below are needed for `pnpm test` to pass, because the new shared components use them.

- **`src/lib/site-settings.ts`**: the optional settings `shareImage` and `analytics`.
- **`src/layouts/BaseLayout.astro`**: the head tags replaced by `<SeoHead … />`, the prop `image`, and `{site.analytics && <Analytics />}`.
- **`src/content.config.ts`**: the schema `({ image }) => z.object({ …, ...seoFields(image) })` for each list.
- **`src/pages/[...lang]/[collection]/[id].astro`**: `{...seoProps(entry.data)}` on `BaseLayout`.
- **`src/site.config.ts`**: the sample `shareImage`.
- **`pnpm-lock.yaml`**: the lock entries of `sharp`.

### sample

- **`src/assets/sample/share.jpg`**: the template's share image. Never copied to a product.

### template-only

- **`template-manifest.yaml`**: the rules for `src/components/seo/**` and `src/components/analytics/**` (shared) and `src/assets/sample/**` (sample).
- **`scripts/init/content.config.ts.tmpl`, `scripts/init/item-collection.ts.tmpl`**, `scripts/init-site.test.mjs`: a new site's lists get the search fields.
- **`docs/template-releases.md`**: the row for this release.
- These notes.

## Upgrade steps

1. Take the `shared` changes: the two new folders in `src/components/`, `astro.config.mjs`, `package.json` (then `pnpm install`, which adds `sharp` to the lock file), the scripts and the docs. A site with its own redirects in `public/_redirects` keeps them from now on: check that the build no longer drops them.
2. In `src/lib/site-settings.ts`, add the optional `shareImage` and `analytics` settings as in the template.
3. In `src/layouts/BaseLayout.astro`, replace the description, robots, title, canonical, alternate, Open Graph and `twitter:card` tags with `<SeoHead … />`, add the `image` prop, and add `{site.analytics && <Analytics />}` after the structured data. Keep the site's own head tags. A site that wrote its own `og:image` removes it and passes the picture as `image` (or `shareImage` in `src/site.config.ts`), so that every page has one `og:image`.
4. In `src/content.config.ts`, give each list `...seoFields(image)`, and in the item page spread `seoProps(entry.data)` into `BaseLayout`.
5. Optional: a share image in `src/site.config.ts` with its alt text in every language (docs/search-engines.md). Visit counts stay off unless the site sets `analytics` (docs/analytics.md).
6. Run `pnpm test` and `pnpm test:a11y`. Write `.template-version` with `version: v0.5.0` and the tag's commit.
