// Languages, URLs and interface strings. Every page and component gets its
// language from here, never from a hard-coded "en".
//
// URLs: with two or more languages every page lives under its language
// (/en, /sl/about), and "/" leads to the default language. With one
// language there is no prefix (/, /about). No address ends in a slash except
// "/" (astro.config.mjs).

import site, { languages, type Lang } from "../site.config";
import de from "./ui/de";
import en, { type UiKey, type UiStrings } from "./ui/en";
import hr from "./ui/hr";
import it from "./ui/it";
import sl from "./ui/sl";
import sr from "./ui/sr";

export { languages, type Lang };
export const defaultLanguage: Lang = site.defaultLanguage;

/** Add a file to ui/ and a line here for each new language. A language not in
 * src/site.config.ts may stay here; it is never used. */
const ui: Record<Lang, UiStrings> & Record<string, UiStrings> = { en, sl, hr, it, sr, de };

/** True when the URLs carry a language prefix. */
export const prefixed = languages.length > 1;

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}

export function isLang(value: string | undefined): value is Lang {
  return (languages as readonly string[]).includes(value ?? "");
}

/** "/" or "/about" in the given language: "/sl" or "/sl/about". */
export function localizedPath(lang: Lang, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!prefixed) return clean;
  return clean === "/" ? `/${lang}` : `/${lang}${clean}`;
}

/**
 * The same page without its language prefix: "/sl/about" gives "/about".
 * At build time a page's path ends in ".html" ("/sl/about.html", "/sl.html":
 * build.format "file"), which is dropped.
 */
export function unlocalizedPath(pathname: string): string {
  const [, first, ...rest] = pathname.replace(/\.html$/, "").split("/");
  const clean = `/${[first, ...rest].join("/")}`;
  const path = prefixed && isLang(first) ? `/${rest.join("/")}` : clean;
  return path.replace(/\/+$/, "") || "/";
}

/**
 * getStaticPaths for a page under src/pages/[...lang]/: one copy per language,
 * or one copy at the root when the site has one language.
 */
export function languagePaths() {
  return languages.map((lang) => ({ params: { lang: prefixed ? lang : undefined }, props: { lang } }));
}

/** The territory each supported language code is written in, for Open Graph (en_GB) and number and date formats. */
const territory: Record<string, string> = {
  en: "GB", sl: "SI", hr: "HR", sr: "RS", it: "IT", de: "DE", fr: "FR", es: "ES", pt: "PT", nl: "NL", pl: "PL", cs: "CZ", sk: "SK", hu: "HU", ro: "RO", bg: "BG", el: "GR", sv: "SE", da: "DK", fi: "FI", nb: "NO",
};

/** The BCP 47 tag for dates and numbers. */
export function locale(lang: Lang): string {
  // Serbian is written in the Latin script on this site.
  if ((lang as string) === "sr") return "sr-Latn";
  return (lang as string) === "en" ? "en-GB" : lang;
}

/** The Open Graph locale, language_TERRITORY: "en_GB", "sl_SI". A code not in the list above repeats itself ("xx_XX"): add it there. */
export function ogLocale(lang: Lang): string {
  return `${lang}_${territory[lang] ?? lang.toUpperCase()}`;
}
