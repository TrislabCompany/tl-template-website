---
paths:
  - "scripts/*.test.mjs"
  - ".pa11yci.json"
  - "lighthouserc.json"
  - "page-weight.config.json"
---

# Testing

Checked by: `ci / ci`, which runs `pnpm test`, `pnpm test:a11y` and Lighthouse CI. Run the first two before every push; Lighthouse runs on GitHub only. The full list is in [docs/quality-checks.md](../../docs/quality-checks.md).

| Command | What it proves |
|---|---|
| `pnpm test` | The manifest and exact pins (`check:template`), types and content (`astro check`), lint, the script tests, the build, then the built site: page weight, `security.txt`, sitemap, the legal pages' claims, a browser pass |
| `pnpm test:a11y` | pa11y (axe) on every page: WCAG 2 AA |
| Lighthouse CI | Performance, accessibility, best practices and SEO budgets |

- **A change is tested by the check that would catch it breaking.** A new page is in the sitemap and pa11y by itself; a new script gets its unit test; a new promise on a legal page gets a rule in `check-claims.mjs`.
- **Don't loosen a budget or an exception to make a check pass.** Fix the page. When a limit is really wrong, change it in its config with the reason in the PR.
- A failing check prints what to fix; read it before changing the check.
