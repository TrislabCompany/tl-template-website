# Configuration

A static site can't read environment variables in the browser. So every deploy writes the Environment's settings into `/config.json`, and the site fetches that file. The same build runs in every Environment, and nothing environment-specific is built into it.

The site's own facts, which are the same in every Environment (languages, company, contact, legal pages), are built into the pages from `src/site.config.ts` instead: see [site-settings.md](site-settings.md).

## 1. The settings

| Kind | Examples | Set by |
| --- | --- | --- |
| Platform settings | `PLATFORM_ENVIRONMENT` (`dev`, `staging` or `production`), `PLATFORM_VERSION` (the tag `vX.Y.Z`, or the commit on dev) | The deploy workflow |
| Your public settings | `PUBLIC_CONTACT_EMAIL` | Variables of the GitHub Environment (section 3) |
| Deploy settings, never in `/config.json` | `CLOUDFLARE_ACCOUNT_ID`, `PAGES_PROJECT`, `SITE_URL`, the secret `CLOUDFLARE_API_TOKEN` | The platform, in the GitHub Environment ([deployment.md](deployment.md#set-up-and-tear-down)) |

Visit counts are not an Environment setting: they are switched on in `src/site.config.ts` and count only on the production domain ([analytics.md](analytics.md)).

The site has no secrets and reads none. A setting that must stay secret doesn't belong in a static site.

## 2. `/config.json`

At deploy, `scripts/write-config.mjs` writes `dist/config.json` from every setting whose name starts with `PLATFORM_` or `PUBLIC_`, and from nothing else. `pages-deploy.yml` passes it all the variables of the GitHub Environment; any other variable never reaches the browser.

```json
{"PLATFORM_ENVIRONMENT":"staging","PLATFORM_VERSION":"v0.3.2","PUBLIC_CONTACT_EMAIL":"hello@example.com"}
```


In the browser, read it only through `src/lib/config.ts`:

```ts
import { loadConfig } from "../lib/config";

const config = await loadConfig();
const email = config.PUBLIC_CONTACT_EMAIL ?? "info@example.com";
```

`loadConfig()` fetches the file once per page. When the file is missing, as with `pnpm dev`, it returns an empty object, so give every value a default. `src/components/EnvironmentBadge.astro` is an example: it shows the Environment and the version everywhere except production. A production deploy takes the badge and its script out of every page, so production pages run no JavaScript; a new component that reads `/config.json` in production must change that step in `scripts/write-config.mjs`.

Values in `/config.json` are read in the browser, after the page has loaded. Content that search engines must see belongs in the pages themselves, not in `/config.json`.

## 3. Add a `PUBLIC_` setting

1. Ask the platform team to add the variable to each GitHub Environment that needs it, with that Environment's value. They are declared in `tl-cloud-infrastructure`, so a PR there sets them.
2. Read it in the site through `loadConfig()`, with a default for when it is unset.
3. Add it to `SiteConfig` in `src/lib/config.ts` if you want its name checked by TypeScript.

The next deploy to that Environment writes it into `/config.json`. For production, that is the next promotion.

To try it locally, write it into a build: `pnpm build`, then `PLATFORM_ENVIRONMENT=local PUBLIC_CONTACT_EMAIL=hello@example.com node scripts/write-config.mjs dist`, and serve `dist/` with `pnpm exec wrangler pages dev dist` ([getting-started.md](getting-started.md)).
