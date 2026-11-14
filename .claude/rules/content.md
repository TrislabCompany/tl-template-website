---
paths:
  - "src/content.config.ts"
  - "src/content/**"
  - "src/site.config.ts"
  - "src/components/seo/fields.ts"
---

# Content and its schemas

Checked by: `astro check` and `astro build`, which validate every entry against the zod schema in `src/content.config.ts`; `check-sitemap.mjs` and `check-claims.mjs` on the built site.

- **Content is per language:** `src/content/<collection>/<language>/<name>.md`. The same file name in two languages is the same item translated. Write a new item in every language of the site, or say in the PR which translations follow.
- **The schema is the contract** between the content and the pages. Give every field a type, a `/** comment */` when its meaning isn't obvious, and a limit where there is one (`z.number().int()`, `.min(1)`).
- **Change a schema only by adding.** A new field is optional or has a `.default()`, so the entries that exist stay valid. Renaming or removing a field changes every entry in every language in the same PR.
- **Every list has the search fields:** `...seoFields(image)` in its schema (`src/components/seo/fields.ts`).
- **A claim needs a source.** A fact a reader could check (a number, a date, a name of a law) has its source in the entry's fields or in `docs/`; never invent one.
- **A new list** is a collection here and an entry in `collections` in `src/site.config.ts`, under the same id (the comment above `services` in `src/content.config.ts`).
- Markdown text: one sentence per line is fine; headings start at `##` (the page has the `h1`).
