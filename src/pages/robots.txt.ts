// /robots.txt: every crawler may read the site, and the sitemap is named with
// the site's own address. A site that limits crawlers (for example AI
// training) adds its rules here.
import type { APIRoute } from "astro";
import site from "../site.config";

export const GET: APIRoute = () => {
  const lines = ["User-agent: *", "Allow: /", "", `Sitemap: ${new URL("/sitemap-index.xml", site.url).toString()}`];
  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
