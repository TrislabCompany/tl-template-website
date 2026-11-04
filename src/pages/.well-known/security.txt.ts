// /.well-known/security.txt (RFC 9116): where to report a security problem.
// The values are in src/site.config.ts; ci checks the expiry date
// (scripts/check-security-txt.mjs).
import type { APIRoute } from "astro";
import { languages } from "../../i18n";
import site from "../../site.config";

export const GET: APIRoute = () => {
  const lines = [
    `Contact: ${site.securityTxt.contact}`,
    `Expires: ${new Date(site.securityTxt.expires).toISOString()}`,
    `Preferred-Languages: ${languages.join(", ")}`,
    `Canonical: ${new URL("/.well-known/security.txt", site.url).toString()}`,
  ];
  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
