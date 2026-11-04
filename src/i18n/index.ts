// Languages, URLs and interface strings. Every page and component gets its
// language from here, never from a hard-coded "en".
//
// URLs: with two or more languages every page lives under its language
// (/en/, /sl/about), and "/" leads to the default language. With one
// language there is no prefix (/, /about).

import site, { languages, type Lang } from "../site.config";
import en, { type UiKey, type UiStrings } from "./ui/en";
import sl from "./ui/sl";

export { languages, type Lang };
export const defaultLanguage: Lang = site.defaultLanguage;

/** Add a file to ui/ and a line here for each new language. A language not in
 * src/site.config.ts may stay here; it is never used. */
const ui: Record<Lang, UiStrings> & Record<string, UiStrings> = { en, sl };

/** True when the URLs carry a language prefix. */
export const prefixed = languages.length > 1;

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}

export function isLang(value: string | undefined): value is Lang {
  return (languages as readonly string[]).includes(value ?? "");
}

/** "/" or "/about" in the given language: "/sl/" or "/sl/about". */
export function localizedPath(lang: Lang, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!prefixed) return clean;
  return clean === "/" ? `/${lang}/` : `/${lang}${clean}`;
}

/** The same page without its language prefix: "/sl/about" gives "/about". */
export function unlocalizedPath(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  const path = prefixed && isLang(first) ? `/${rest.join("/")}` : pathname;
  return path.replace(/\/+$/, "") || "/";
}

/**
 * getStaticPaths for a page under src/pages/[...lang]/: one copy per language,
 * or one copy at the root when the site has one language.
 */
export function languagePaths() {
  return languages.map((lang) => ({ params: { lang: prefixed ? lang : undefined }, props: { lang } }));
}

/** The BCP 47 tag for dates and numbers. */
export function locale(lang: Lang): string {
  return lang === "en" ? "en-GB" : lang;
}
