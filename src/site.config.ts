// The site's own facts, read at build time: languages, company, contact,
// legal pages, structured data and security.txt. Change the values here; the
// shape is in src/lib/site-settings.ts. Nothing here is secret: it all ends up
// in the public pages. Values that differ per Environment go to /config.json
// instead (src/lib/config.ts).

import type { SiteSettings } from "./lib/site-settings";

/** The site's languages. With one language, the URLs have no language prefix. */
export const languages = ["en", "sl"] as const;
export type Lang = (typeof languages)[number];

const site: SiteSettings<Lang> = {
  url: "https://www.example.com",
  name: "Website template",
  description: {
    en: "A sample site built from tl-template-website.",
    sl: "Vzorčna stran, zgrajena iz tl-template-website.",
  },
  languages,
  defaultLanguage: "en",

  company: {
    name: "Example",
    legalName: "Example d.o.o.",
    address: { street: "Example street 1", postalCode: "1000", city: "Ljubljana", country: "SI" },
    registrationNumber: "0000000000",
    vatId: "SI00000000",
    logo: "/favicon.svg",
    profiles: [],
  },

  contact: {
    topics: [
      { email: "info@example.com", label: { en: "General questions", sl: "Splošna vprašanja" } },
      { email: "sales@example.com", label: { en: "Sales", sl: "Prodaja" } },
    ],
    mapUrl: "https://www.openstreetmap.org/search?query=Ljubljana",
  },

  legalPages: { imprint: true, privacy: true, accessibility: true },

  structuredData: "Organization",

  securityTxt: {
    contact: "mailto:security@example.com",
    expires: "2027-10-31T23:00:00.000Z",
  },
};

export default site;
