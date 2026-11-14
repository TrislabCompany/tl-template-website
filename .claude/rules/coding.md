---
paths:
  - "src/**/*.astro"
  - "src/**/*.ts"
  - "src/**/*.css"
---

# Coding standards for the site

Checked by: `pnpm test`, which runs `astro check` (strict TypeScript, `tsconfig.json`), ESLint (`eslint.config.js`, with `no-console` in `src/`), the build and the checks on the built site; `pnpm test:a11y`. How the site is built is in [docs/architecture.md](../../docs/architecture.md).

## Where code goes

- Pages in `src/pages/[...lang]/`, one layout (`src/layouts/BaseLayout.astro`), components in `src/components/`, helpers in `src/lib/`. A component is one `.astro` file named after it in PascalCase (`ItemCard.astro`).
- `src/components/seo/`, `analytics/` and `forms/` are `shared` with the template: a fix there goes to the template first, or the next update conflicts.
- The site's facts (company, contact, lists, legal pages) live in `src/site.config.ts`, never in a page or component.

## Components

- Every component starts with a one-line comment saying what it is, and an `interface Props`. Optional props have defaults in the destructuring.
- Every visible string comes from `t(lang, key)` (`src/i18n/ui/<lang>.ts`, every language) or from content; every link from `localizedPath(lang, …)`. Never a hard-coded `"en"`, text or path.
- Semantic HTML first: headings in order, lists for lists, `<a>` to go somewhere and `<button>` to do something. Images through Astro's `<Image>` with `alt` (empty only for decoration).
- Colours and fonts only through the names in `src/styles/tokens.css`; no colour values in components.

## Scripts in the browser

The site ships no JavaScript by default, and the legal pages say so (`check-claims.mjs`). A `<script>` is allowed only in the components that already have one (`EnvironmentBadge`, `analytics/`, `forms/`); a new one needs the template's change and the claims updated.

## Errors and logging

There is no server code: the site is static files. So there is nothing to log in `src/`, and `console.*` there fails lint. A build-time problem (a missing setting, a bad entry) throws an `Error` that names the file and the field, so the build stops with the fix in the message. Form handling (D-14) is the shared Trislab form endpoint, which follows the platform's logging contract.
