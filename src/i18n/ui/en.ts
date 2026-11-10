// The interface strings in English: menus, buttons, legal page titles and the
// labels of the contact and imprint pages. The texts of a site's pages are not
// here: they are in src/content/ and src/site.config.ts. Every other language
// file has the same keys (the type UiStrings makes sure of it).
const en = {
  "nav.home": "Home",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.main": "Main",
  "nav.skip": "Skip to content",
  "language.switch": "Language",
  "cta.contact": "Contact us",
  "cta.readMore": "Read more",
  "cta.heading": "Interested?",
  "cta.text": "Write to us and we will get back to you.",
  "footer.noCookies": "This website uses no cookies.",
  "footer.rights": "All rights reserved.",
  "legal.nav": "Legal",
  "legal.imprint": "Imprint",
  "legal.privacy": "Privacy policy",
  "legal.accessibility": "Accessibility statement",
  "legal.sustainability": "Sustainability",
  "legal.sitemap": "Sitemap",
  "imprint.company": "Company",
  "imprint.address": "Address",
  "imprint.registrationNumber": "Registration number",
  "imprint.vatId": "VAT ID",
  "imprint.contact": "Contact",
  "contact.title": "Contact",
  "contact.lead": "For collaboration or enquiries, write to us directly.",
  "contact.address": "Address",
  "contact.email": "E-mail",
  "contact.phone": "Phone",
  "contact.map": "Show on a map",
  "contact.googleBusiness": "Our Google Business profile",
  "notFound.title": "Page not found",
  "notFound.text": "The page you asked for doesn't exist.",
  "notFound.home": "Go to the home page",
};

export type UiKey = keyof typeof en;
export type UiStrings = Record<UiKey, string>;
export default en satisfies UiStrings;
