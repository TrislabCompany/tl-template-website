// Checks dist/.well-known/security.txt after `astro build`: it must exist,
// name a contact, and not be expired (RFC 9116). It warns 30 days before the
// expiry date, so there is time to move the date in src/site.config.ts.
// Run by `pnpm test`, so ci runs it on every PR.

import { readFile } from "node:fs/promises";

const WARN_DAYS = 30;
const file = new URL("../dist/.well-known/security.txt", import.meta.url);

let text;
try {
  text = await readFile(file, "utf8");
} catch {
  console.error("security.txt: dist/.well-known/security.txt is missing. Run `astro build` first.");
  process.exit(1);
}

const field = (name) => text.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1]?.trim();
const contact = field("Contact");
const expires = field("Expires");

if (!contact) {
  console.error("security.txt: no Contact field. Set securityTxt.contact in src/site.config.ts.");
  process.exit(1);
}

const expiry = new Date(expires ?? "");
if (Number.isNaN(expiry.valueOf())) {
  console.error("security.txt: no valid Expires field. Set securityTxt.expires in src/site.config.ts.");
  process.exit(1);
}

const days = Math.floor((expiry.valueOf() - Date.now()) / 86_400_000);
if (days < 0) {
  console.error(`security.txt: expired on ${expiry.toISOString()}. Move securityTxt.expires in src/site.config.ts.`);
  process.exit(1);
}
if (days > 366) {
  console.error(`security.txt: Expires is ${days} days away; RFC 9116 asks for less than a year.`);
  process.exit(1);
}
if (days < WARN_DAYS) {
  // A GitHub Actions warning annotation; plain text elsewhere.
  console.warn(`::warning title=security.txt::expires in ${days} days (${expiry.toISOString()}). Move securityTxt.expires in src/site.config.ts.`);
} else {
  console.log(`security.txt: ok, expires in ${days} days.`);
}
