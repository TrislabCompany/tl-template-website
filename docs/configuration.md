# Configuration

A static site can't read environment variables in the browser. So the container writes them into `/config.json` when it starts, and the site fetches that file. One image runs in every Environment, and nothing environment-specific is built into it.

## 1. The settings

| Kind | Examples | Set by |
| --- | --- | --- |
| Platform settings | `PLATFORM_STAMP`, `PLATFORM_ENVIRONMENT`, `PLATFORM_TENANCY`, `PLATFORM_TENANTS` | The platform, on every app of the stamp |
| Your public settings | `PUBLIC_CONTACT_EMAIL`, `PUBLIC_ANALYTICS_ID` | You, in the stamp's `stamp.yaml` (section 3) |

The site has no secrets and reads none. A setting that must stay secret doesn't belong in a static site.

## 2. `/config.json`

At container start, `docker-entrypoint.d/40-config.sh` writes `/config.json` from every setting whose name starts with `PLATFORM_` or `PUBLIC_`, and from nothing else. Any other setting the container has never reaches the browser.

```json
{"PLATFORM_STAMP":"shr-web-staging","PLATFORM_ENVIRONMENT":"staging","PUBLIC_CONTACT_EMAIL":"hello@example.com"}
```

In the browser, read it only through `src/lib/config.ts`:

```ts
import { loadConfig } from "../lib/config";

const config = await loadConfig();
const email = config.PUBLIC_CONTACT_EMAIL ?? "info@example.com";
```

`loadConfig()` fetches the file once per page. When the file is missing, as with `pnpm dev`, it returns an empty object, so give every value a default. `src/components/EnvironmentBadge.astro` is an example.

Values in `/config.json` are read in the browser, after the page has loaded. Content that search engines must see belongs in the pages themselves, not in `/config.json`.

## 3. Add a `PUBLIC_` setting

1. Add the setting to the app in the stamp's `stamp.yaml`, in `tl-cloud-infrastructure` under `stamps/<landing zone>/<folder>/`, under `apps[].env` of the app `web`:

   ```yaml
   apps:
     - name: web
       env:
         PUBLIC_CONTACT_EMAIL: hello@example.com
   ```

   Each Environment is its own stamp, so set it in each stamp that needs it, with that Environment's value. The PR goes through the infrastructure pipeline, and your team can open it.
2. Read it in the site through `loadConfig()`, with a default for when it is unset.
3. Add it to `SiteConfig` in `src/lib/config.ts` if you want its name checked by TypeScript.

The next deploy after the stamp's apply starts the container with the setting.

To try it locally, pass it to the container: `docker run --rm -p 8080:8080 -e PUBLIC_CONTACT_EMAIL=hello@example.com website-web:local`.
