# Site settings

The site's own facts live in one file, `src/site.config.ts`, and are built into the pages: the languages, the company, the contact details, the legal pages, the structured data and `security.txt`. Search engines see them, because they are in the HTML. Nothing in this file is secret.

`src/site.config.ts` is different from `/config.json` ([configuration.md](configuration.md)). `/config.json` holds values that differ per Environment and are read in the browser after the page loads. A value that is the same in every Environment, and that search engines must see, belongs in `src/site.config.ts`.

The shape of the settings is in `src/lib/site-settings.ts`. Change the values, never the shape.

## 1. Languages

```ts
export const languages = ["en", "sl"] as const;
// …
defaultLanguage: "en",
```

| Languages | URLs |
| --- | --- |
| Two or more | Every page lives under its language: `/en`, `/sl/about`. `/` leads to the default language |
| One | No prefix: `/`, `/about`. No language switch and no `hreflang` |

Every page has a canonical link, an `hreflang` link for each language it exists in, and an `x-default` link to the default language. The header has a language switch made of plain links, with no JavaScript. The sitemap (`/sitemap-index.xml`) lists every page in every language, with the other languages as alternates, and `/robots.txt` names it.

To add a language:

1. Add its code to `languages` in `src/site.config.ts`. TypeScript then asks for every text in that language (`description`, contact topic labels and so on).
2. Add the interface strings: the template has packs for Croatian (`hr`), Italian (`it`), Serbian in the Latin script (`sr`) and German (`de`) in `src/i18n/ui/`, registered in `ui` in `src/i18n/index.ts`; they hold only interface strings, never site copy. A site made with `pnpm init-site` keeps only the packs of its own languages (and `en`, which defines the strings' type): copy a missing one from `tl-template-website`. For another language, copy `src/i18n/ui/en.ts` to `src/i18n/ui/<code>.ts`, translate the strings and register it there. A new code may also need a line in `territory` in `src/i18n/index.ts`, for the Open Graph locale.
3. Add the content in `src/content/<collection>/<code>/`.

The site doesn't detect the visitor's language; the visitor chooses it.

### Pages and content per language

A page under `src/pages/[...lang]/` is built once per language. It gets its language from `languagePaths()` in `src/i18n/index.ts`:

```astro
---
import { languagePaths, t, type Lang } from "../../i18n";
export const getStaticPaths = languagePaths;
const { lang } = Astro.props as { lang: Lang };
---
<h1>{t(lang, "nav.about")}</h1>
```

Link to another page with `localizedPath(lang, "/about")`, never with a hard-coded `/about`.

Content is kept per language: `src/content/services/en/first-service.md` and `src/content/services/sl/first-service.md` are the same item in two languages. An item that exists in only one language is built only in that language, and its `hreflang` links name only that language. The helpers are in `src/lib/content.ts`.

## 2. Lists of items

A list of items, such as services, products, news or cases, is a folder of Markdown files, one per item and language, and an entry in `collections` of `src/site.config.ts`. The template has one sample list, `services`; `pnpm init-site` replaces it with the lists of the site's `site.yaml`. Each list gets a list page, `/<lang>/<id>`, one page per item, `/<lang>/<id>/<name>`, a section on the home page (`home`), a link in the menu (`nav`) and a place in the sitemap page, all from the same entry.

To add a list:

1. Add a collection with the id to `src/content.config.ts`: copy `services` and change its folder. The schema needs `title`, `summary` and `order`; add fields as the items need them.
2. Add an entry with the id, the title and the lead sentence of each language, `nav` and `home` to `collections` in `src/site.config.ts`.
3. Add the items in `src/content/<id>/<language>/<name>.md`.

To have no list, remove the entry, the collection and the folder. The pages are `src/pages/[...lang]/[collection]/index.astro` and `[id].astro`; `src/lib/items.ts` has the helpers and `src/components/ItemCard.astro` draws an item in a list.

## 3. Contact page

`/<lang>/contact` shows the address, a link to a map, e-mail links by topic, and optionally a phone number and a Google Business profile, all from `contact` and `company` in the settings. Use role mailboxes (info, sales, support), never a person's address.

There is no form: the site has no backend. The map is a plain link, never embedded, because an embedded map loads an outside service and may set cookies.

## 4. Legal pages

| Page | Address | Text from |
| --- | --- | --- |
| Imprint | `/<lang>/imprint` | `company` in the settings: legal name, address, registration number, VAT ID, contact, and any `imprintNotes` |
| Privacy policy | `/<lang>/privacy` | `src/content/legal/<lang>/privacy.md` |
| Accessibility statement | `/<lang>/accessibility` | `src/content/legal/<lang>/accessibility.md` |
| Sustainability (ESG) | `/<lang>/sustainability` | `src/content/legal/<lang>/sustainability.md`. `pnpm test` checks that its page weight and CO₂e figures match the build (`scripts/check-claims.mjs`); update them when it says so |
| Sustainability (ESG) | `/<lang>/sustainability` | `src/content/legal/<lang>/sustainability.md` |

Switch each page on or off in `legalPages`. The pages show no date. The footer links to the pages that are on. A page that is on must have its text in every language, or the build fails and names the missing file. The sample texts are placeholders: replace them with the site's own texts, reviewed by a lawyer.

## 5. Structured data

Every page carries the company as JSON-LD (schema.org): `Organization`, or `LocalBusiness` for a business whose customers visit its address. Set it with `structuredData`; `"none"` leaves it out. It uses the name, legal name, logo, address, VAT ID, first contact e-mail, phone and profiles from the settings.

The JSON-LD is an inline `<script type="application/ld+json">`. Browsers never run a script of that type, so the Content-Security-Policy (`script-src 'self'`) doesn't block it and needs no change.

### Share image and search

`shareImage` is the picture shown when a page is shared: an imported photo, cropped to 1200 × 630 at build, with what it shows in every language. The search tags of every page, the sitemap, the search fields of an item and Google Search Console are in [search-engines.md](search-engines.md).

### Visit counts

`analytics` switches on cookieless visit counts with Plausible, on the production domain only. It also needs an origin in `public/_headers` and a sentence in the privacy policy: [analytics.md](analytics.md).

## 6. security.txt

`/.well-known/security.txt` (RFC 9116) tells security researchers where to report a problem. It is built from `securityTxt`: a role mailbox or URL as the contact, and an expiry date at most a year ahead. It also lists the site's languages and its own address.

`pnpm test` checks the built file. It fails when the file is expired or the date is more than a year ahead, and warns from 30 days before the expiry date. Move the date forward once a year.

## 7. Page-weight budget

`pnpm test` builds the site and checks every page against the limits in `page-weight.config.json`:

| Limit | Default |
| --- | --- |
| Total per page: the HTML and every local file it loads (styles, scripts, fonts, images) | 500 KB |
| JavaScript per page | 50 KB |

Sizes are the files as built, before compression, so the check errs on the safe side. Only the largest image of a `srcset` counts. A site may lower the limits. A higher limit needs a reason in the site's README.

The check writes `page-weight-report.json` (not committed, not served), with each page's weight and the average. The yearly CO₂ estimate ([section 8](#8-yearly-co₂-estimate)) reads it.

## 8. Yearly CO₂ estimate

The site can have a yearly CO₂ estimate for the ESG figures of the site's owner. It is for internal use. Never publish it on the site.

The estimate is the web part only: the data centre, the network and the visitors' devices. It multiplies the average page weight by the yearly visits, with the Sustainable Web Design model, version 4, in the open-source library [CO2.js](https://developers.thegreenwebfoundation.org/co2js/) (`@tgwf/co2`, pinned in `package.json`). `pnpm co2` does it.

### When to run it

Once a year, for the year just ended, for example in January.

### How to run it

1. Run `pnpm install` and `pnpm test`. The test builds the site and writes `page-weight-report.json`. The script stops with a message when the file is missing.
2. Get the visits of the year. A site with analytics takes them from the analytics tool. A site without analytics takes the visits from Cloudflare traffic statistics. Say which one in `--visits-source`.
3. Run:

   ```
   pnpm co2 --visits 120000 --visits-source "Cloudflare traffic statistics"
   ```

4. Commit `docs/co2/<year>.md`. It is the record of the year. Without `--force` the script does not overwrite a note.

Other options: `--year` (default: this year), `--green`, `--report`, `--out`, `--force`. `pnpm co2 --help` lists them.

### What the note says

The note `docs/co2/<year>.md` holds the date, the average page weight, the visits and their source, the model and its version, the CO2.js version, and the result in kg CO₂e per year and in g per visit. The result is calculated from measured page weight and visits, so it is only as good as the visit count.

### Assumptions

- A visit loads one page of the average weight, with no cache. This is on the safe side for a visit with one page and low for a visit with many.
- The host is not counted as green hosting. Use `--green` only when the host is verified against the Green Web Foundation list. The note says which was used.
- Only the web part is counted. The hosting and shared infrastructure are not split per site and are in no figure.

## 9. Brand and the values kept in one place

A site's look and its facts are kept in few files, so that changing a site means changing these and the content, not the pages:

| File | Holds |
| --- | --- |
| `src/site.config.ts` | Name, address, description, languages, `themeColor`, the lists of items (`collections`), company, contact, legal pages, structured data, `security.txt` |
| `src/styles/tokens.css` | The brand's colours, radius and font. `src/styles/global.css` holds the layout and uses only these names |
| `src/components/Logo.astro` and `public/favicon.svg` | The logo. The only brand files besides `tokens.css`; the template has a neutral sample |
| `src/i18n/ui/<language>.ts` | Interface strings, never site copy |
| `src/content/` | Every text of the pages: items, legal texts |
| `lighthouserc.json` | The pages Lighthouse checks: change its URLs when the sample pages change |

Everything else derives from these. `scripts/ci-scope.mjs` reads the content folders and the languages from the repository, so it needs no change when a list is added.
