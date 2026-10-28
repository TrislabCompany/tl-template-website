// The one place the site reads environment-specific values.
//
// A static site can't read environment variables in the browser, so the
// container writes /config.json when it starts, from every PLATFORM_* setting
// and every setting whose name starts with PUBLIC_
// (docker-entrypoint.d/40-config.sh). It holds no secrets. With `pnpm dev`
// the file doesn't exist, and every value is unset.

export interface SiteConfig {
  PLATFORM_ENVIRONMENT?: string;
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
