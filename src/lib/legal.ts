// getStaticPaths for the legal pages kept as content
// (src/content/legal/<language>/<page>.md). A page switched on in
// src/site.config.ts must have its text in every language, or the build fails.

import { getCollection } from "astro:content";
import { languages, prefixed } from "../i18n";
import site from "../site.config";
import { entryLang, entrySlug } from "./content";

export async function legalPaths(page: "privacy" | "accessibility") {
  if (!site.legalPages[page]) return [];
  const entries = (await getCollection("legal")).filter((entry) => entrySlug(entry) === page);
  return languages.map((lang) => {
    const entry = entries.find((candidate) => entryLang(candidate) === lang);
    if (!entry) {
      throw new Error(`legalPages.${page} is on, but src/content/legal/${lang}/${page}.md is missing.`);
    }
    return { params: { lang: prefixed ? lang : undefined }, props: { lang, entry } };
  });
}
