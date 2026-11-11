# Visit counts (analytics)

A site counts its visits only if it asks to. By default it runs no analytics, sets no cookies and loads nothing from another site. A site that wants visit counts uses [Plausible Analytics](https://plausible.io): a tool from the EU that sets no cookies and keeps no personal profiles ([its data policy](https://plausible.io/data-policy)). Search performance is something else: it is in Google Search Console and needs nothing in the site ([search-engines.md](search-engines.md#5-google-search-console)).

## 1. What it counts

- **One page view per page**, with the address (without its query string), the referring site, and the browser and country Plausible derives from the request.
- **The event `Contact`** when a visitor follows an e-mail or phone link, with the property `method`: `e-mail` or `phone`.
- **Only on the production domain**, the host of `url` in `src/site.config.ts`. dev, staging, `pnpm dev` and the checks in ci count nothing, and production before its cutover (on `production.<domain>`) neither.

`src/components/analytics/Analytics.astro` does it with a script of about 1 KB, built into the site's own files (`/_astro/`), so `script-src 'self'` stays as it is. Only the events leave the site, to the endpoint. No cookie is set and nothing is stored on the device.

## 2. Turn it on

1. **In Plausible** (Trislab's account): add the site under its domain, for example `example.com`, and add the goal *Contact* (a custom event) with the property `method`. The subscription is a running cost of the site.
2. **In `src/site.config.ts`:**

   ```ts
   analytics: { provider: "plausible" },
   ```

   `domain` is the site's name in Plausible; by default the host of `url` without `www.`. `endpoint` is where events go; by default `https://plausible.io/api/event`.
3. **In `public/_headers`:** add the endpoint's origin to `connect-src`: `connect-src 'self' https://plausible.io`.
4. **In the legal texts of every language** (`src/content/legal/<language>/`), have them reviewed:
   - **privacy policy:** name Plausible, what it receives and why. For example: *"We count visits with Plausible Analytics (Plausible Insights OÜ, Estonia), which sets no cookies and stores no personal data. For each page view it receives the address of the page, the referring site, and the browser and country derived from the request; the IP address is not stored."* In Slovenian: *»Obiske štejemo s Plausible Analytics (Plausible Insights OÜ, Estonija), ki ne nastavlja piškotkov in ne hrani osebnih podatkov. Za vsak ogled strani prejme naslov strani, stran, s katere je obiskovalec prišel, ter brskalnik in državo, izpeljana iz zahteve; naslova IP ne hrani.«*
   - **sustainability page:** the row *JavaScript* becomes "one small script for anonymous visit counts", and the sentence "no analytics" goes.
   - **the footer** ("uses no cookies") stays true.

   Whether a site without cookies needs no consent banner under the law that applies to it is for the lawyer who reviews the privacy policy to confirm.

`pnpm test` then checks it all:

- `scripts/check-claims.mjs`: production pages run no script but the analytics one; `connect-src` allows the endpoint; the privacy policy of every language names Plausible.
- `scripts/check-browser.mjs`: the pages served from `127.0.0.1` send nothing; one page opened as the production host sends exactly one page view, to the endpoint and nowhere else, and sets no cookie.

The counting starts with the next promotion to production.

## 3. Turn it off

Remove `analytics` from `src/site.config.ts`, the origin from `connect-src`, and the analytics text from the legal pages. Delete the site in Plausible once its data is no longer needed.
