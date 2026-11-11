# Visit counts (analytics)

A site counts its visits only if it asks to. By default it runs no analytics, sets no cookies and loads nothing from another site. A site that wants visit counts chooses one of two providers with `analytics.provider` in `src/site.config.ts`: [Plausible Analytics](https://plausible.io), a tool from the EU that sets no cookies and keeps no personal profiles ([its data policy](https://plausible.io/data-policy)), described in sections 1 to 3; or Cloudflare Web Analytics, described in section 4. Search performance is something else: it is in Google Search Console and needs nothing in the site ([search-engines.md](search-engines.md#5-google-search-console)).

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

The same for both providers. Remove `analytics` from `src/site.config.ts`, the origins from the Content-Security-Policy, and the analytics text from the legal pages. With Plausible, delete the site there once its data is no longer needed; with Cloudflare, remove `web_analytics: true` in the infrastructure repository.

## 4. Cloudflare Web Analytics

An alternative provider, off like everything else until the site sets it. Use it when Cloudflare's numbers are enough and no further processor is wanted: Cloudflare, Inc. already hosts the site and is already named in the privacy policy as its processor.

### What it counts

- **Page views, referrers, countries and devices**, from the request, with no cookie and nothing stored on the device.
- **Core Web Vitals of real visitors** (how fast the pages load and respond for them), which Plausible does not measure.
- **No custom events**, so there is no `Contact` event: Cloudflare's script cannot send one.
- **Only on the production domain**, the host of `url`, as with Plausible. dev, staging, `pnpm dev`, the checks in ci and production before its cutover (on `production.<domain>`) load nothing from Cloudflare.

`Analytics.astro` adds the tag `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"..."}'>` to the page only when the visitor's host is the production host. It does so from a script of the site's own (in `/_astro/`), so `script-src` needs the beacon's origin and never `'unsafe-inline'`.

### Turn it on

1. **In the infrastructure repository:** set `web_analytics: true` on the production environment of the product in tl-cloud-infrastructure `catalog/products.yaml`. Its pull request creates the resource `cloudflare_web_analytics_site` and gives the site token. The token is public (it is in every page), but it comes from the infrastructure repository.
2. **In `src/site.config.ts`:**

   ```ts
   analytics: { provider: "cloudflare", token: "<site token>" },
   ```

3. **In `public/_headers`:** the template's default stays as it is, because analytics is off by default. Add two origins to the Content-Security-Policy of the `/*` rule:

   - `script-src 'self' https://static.cloudflareinsights.com`
   - `connect-src 'self' https://cloudflareinsights.com`

   Set each directive once: a second rule for the same path does not add up.
4. **In the legal texts of every language** (`src/content/legal/<language>/`), have them reviewed. The privacy policy must name *Cloudflare Web Analytics*. For example: *"We count visits with Cloudflare Web Analytics (Cloudflare, Inc., our hosting provider and processor). It sets no cookies and stores nothing on your device. For each page view it receives the address of the page, the referring site, and the browser, device and country derived from the request, and how fast the page loaded for you. It builds no profile of you."* In Slovenian: *»Obiske štejemo s Cloudflare Web Analytics (Cloudflare, Inc., naš ponudnik gostovanja in obdelovalec). Ne nastavlja piškotkov in nič ne shranjuje v vaši napravi. Za vsak ogled strani prejme naslov strani, stran, s katere ste prišli, ter brskalnik, napravo in državo, izpeljane iz zahteve, in hitrost nalaganja strani. Vašega profila ne ustvarja.«* The sustainability page and the footer change as in step 4 of section 2.

`pnpm test` then checks it, as it does for Plausible:

- `scripts/check-claims.mjs`: production pages run no script but the analytics one; `script-src` allows `https://static.cloudflareinsights.com` and `connect-src` allows `https://cloudflareinsights.com`; the privacy policy of every language names Cloudflare Web Analytics.
- `scripts/check-browser.mjs`: the pages served from `127.0.0.1` load nothing; one page opened as the production host loads the beacon exactly once, with the token in `data-cf-beacon`, sends requests only to cloudflareinsights.com, and sets no cookie. (The check answers the beacon itself; nothing leaves the machine.)

The numbers appear in the Cloudflare dashboard (Web Analytics) after the next promotion to production.
