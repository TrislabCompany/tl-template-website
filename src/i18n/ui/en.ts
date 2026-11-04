// The interface strings in English. Every other language file has the same
// keys (the type UiStrings makes sure of it).
const en = {
  "nav.home": "Home",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.main": "Main",
  "language.switch": "Language",
  "articles.heading": "Articles",
  "footer.builtFrom": "Built from tl-template-website",
  "legal.nav": "Legal",
  "legal.imprint": "Imprint",
  "legal.privacy": "Privacy policy",
  "legal.accessibility": "Accessibility statement",
  "imprint.company": "Company",
  "imprint.address": "Address",
  "imprint.registrationNumber": "Registration number",
  "imprint.vatId": "VAT ID",
  "imprint.contact": "Contact",
  "contact.title": "Contact",
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
