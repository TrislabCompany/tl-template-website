// The one place the site reads environment-specific values.
//
// A static site can't read environment variables in the browser, so each
// deploy writes /config.json into the built site, from every PLATFORM_*
// setting and every setting whose name starts with PUBLIC_
// (scripts/write-config.mjs). It holds no secrets. With `pnpm dev` the file
// doesn't exist, and every value is unset.

export interface SiteConfig {
  PLATFORM_ENVIRONMENT?: string;
  /** What runs: the release tag (vX.Y.Z) on staging and production, the commit on dev. */
  PLATFORM_VERSION?: string;
  PLATFORM_STAMP?: string;
  [name: `PLATFORM_${string}` | `PUBLIC_${string}`]: string | undefined;
}

let config: Promise<SiteConfig> | undefined;

export function loadConfig(): Promise<SiteConfig> {
  config ??= fetch("/config.json", { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<SiteConfig>) : {}))
    .catch(() => ({}));
  return config;
}
