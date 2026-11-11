// The site's own facts, read at build time: languages, company, contact,
// legal pages, lists of items, structured data and security.txt. Change the
// values here; the shape is in src/lib/site-settings.ts. Nothing here is
// secret: it all ends up in the public pages. Values that differ per
// Environment go to /config.json instead (src/lib/config.ts).

import shareImage from "./assets/sample/share.jpg";
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
  shareImage: {
    src: shareImage,
    alt: { en: "The name of the website template on a blue background", sl: "Ime predloge spletne strani na modri podlagi" },
  },
  themeColor: "#2457c5",

  // Lists of items kept as Markdown: src/content/<id>/<language>/<name>.md.
  // Each id also needs a collection in src/content.config.ts.
  collections: [
    {
      id: "services",
      title: { en: "Services", sl: "Storitve" },
      lead: { en: "A sample list of items, kept as Markdown files.", sl: "Vzorčen seznam elementov, shranjenih kot datoteke Markdown." },
      nav: true,
      home: true,
    },
  ],

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

  legalPages: { imprint: true, privacy: true, accessibility: true, sustainability: true },

  structuredData: "Organization",

  securityTxt: {
    contact: "mailto:security@example.com",
    expires: "2027-10-31T23:00:00.000Z",
  },
};

export default site;
