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
| Two or more | Every page lives under its language: `/en/`, `/sl/about`. `/` leads to the default language |
| One | No prefix: `/`, `/about`. No language switch and no `hreflang` |

Every page has a canonical link, an `hreflang` link for each language it exists in, and an `x-default` link to the default language. The header has a language switch made of plain links, with no JavaScript. The sitemap (`/sitemap-index.xml`) lists every page in every language, with the other languages as alternates, and `/robots.txt` names it.

To add a language:

1. Add its code to `languages` in `src/site.config.ts`. TypeScript then asks for every text in that language (`description`, contact topic labels and so on).
2. Copy `src/i18n/ui/en.ts` to `src/i18n/ui/<code>.ts`, translate the strings, and add it to `ui` in `src/i18n/index.ts`.
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

Content is kept per language: `src/content/articles/en/welcome.md` and `src/content/articles/sl/welcome.md` are the same article in two languages. An item that exists in only one language is built only in that language, and its `hreflang` links name only that language. The helpers are in `src/lib/content.ts`.

## 2. Contact page

`/<lang>/contact` shows the address, a link to a map, e-mail links by topic, and optionally a phone number and a Google Business profile, all from `contact` and `company` in the settings. Use role mailboxes (info, sales, support), never a person's address.

There is no form: the site has no backend. The map is a plain link, never embedded, because an embedded map loads an outside service and may set cookies.

## 3. Legal pages

| Page | Address | Text from |
| --- | --- | --- |
| Imprint | `/<lang>/imprint` | `company` in the settings: legal name, address, registration number, VAT ID, contact, and any `imprintNotes` |
| Privacy policy | `/<lang>/privacy` | `src/content/legal/<lang>/privacy.md` |
| Accessibility statement | `/<lang>/accessibility` | `src/content/legal/<lang>/accessibility.md` |

Switch each page on or off in `legalPages`. The footer links to the pages that are on. A page that is on must have its text in every language, or the build fails and names the missing file. The sample texts are placeholders: replace them with the texts from Trislab's shared legal pack, filled in and reviewed.

## 4. Structured data

Every page carries the company as JSON-LD (schema.org): `Organization`, or `LocalBusiness` for a business whose customers visit its address. Set it with `structuredData`; `"none"` leaves it out. It uses the name, legal name, logo, address, VAT ID, first contact e-mail, phone and profiles from the settings.

The JSON-LD is an inline `<script type="application/ld+json">`. Browsers never run a script of that type, so the Content-Security-Policy (`script-src 'self'`) doesn't block it and needs no change.

## 5. security.txt

`/.well-known/security.txt` (RFC 9116) tells security researchers where to report a problem. It is built from `securityTxt`: a role mailbox or URL as the contact, and an expiry date at most a year ahead. It also lists the site's languages and its own address.

`pnpm test` checks the built file. It fails when the file is expired or the date is more than a year ahead, and warns from 30 days before the expiry date. Move the date forward once a year.

## 6. Page-weight budget

`pnpm test` builds the site and checks every page against the limits in `page-weight.config.json`:

| Limit | Default |
| --- | --- |
| Total per page: the HTML and every local file it loads (styles, scripts, fonts, images) | 500 KB |
| JavaScript per page | 50 KB |

Sizes are the files as built, before compression, so the check errs on the safe side. Only the largest image of a `srcset` counts. A site may lower the limits. A higher limit needs a reason in the site's README.

The check writes `page-weight-report.json` (not committed, not served), with each page's weight and the average, for a yearly CO₂ estimate.
