// The shape of src/site.config.ts. A site changes the values there, never
// this file. L is the union of the site's language codes, so every text that
// differs per language must be given in all of them.

export type Localized<L extends string> = Record<L, string>;

export interface PostalAddress {
  street: string;
  postalCode: string;
  city: string;
  /** ISO 3166-1 alpha-2 code, for example "SI". */
  country: string;
}

export interface SiteSettings<L extends string> {
  /** The main address of the site in production, with no trailing slash. */
  url: string;
  /** The site's name in the header and in the page titles. */
  name: string;
  /** The default description of a page, per language. */
  description: Localized<L>;
  /** The languages, in the order the language switch shows them. */
  languages: readonly L[];
  /** The language "/" leads to, and the target of hreflang x-default. */
  defaultLanguage: L;

  company: {
    /** The name people know, for example "Trislab". */
    name: string;
    /** The registered name, for example "Trislab d.o.o.". */
    legalName: string;
    address: PostalAddress;
    registrationNumber?: string;
    vatId?: string;
    /** Any other line the law asks for in the imprint (court register, share capital…), per language. */
    imprintNotes?: Localized<L>[];
    /** A path under public/, or an absolute URL. */
    logo: string;
    /** Profiles of the company elsewhere (LinkedIn, GitHub…), as absolute URLs. */
    profiles: string[];
  };

  contact: {
    /** E-mail by topic. Role mailboxes only, never a person's address. */
    topics: { email: string; label: Localized<L> }[];
    phone?: string;
    /** A plain link to a map. Nothing is embedded: an embedded map loads an outside service. */
    mapUrl?: string;
    googleBusinessUrl?: string;
  };

  /** Which legal pages the site has. The texts are in src/content/legal/<language>/. */
  legalPages: {
    imprint: boolean;
    privacy: boolean;
    /** Only where the law requires one, or the client wants it. */
    accessibility: boolean;
  };

  /** The JSON-LD on every page: Organization, or LocalBusiness when customers visit the address. */
  structuredData: "Organization" | "LocalBusiness" | "none";

  /** /.well-known/security.txt (RFC 9116). */
  securityTxt: {
    /** A role mailbox or a URL, for example "mailto:security@example.com". */
    contact: string;
    /** ISO date-time; at most a year ahead. ci warns 30 days before and fails after it. */
    expires: string;
  };
}
