// Helpers for content kept per language (src/content/<collection>/<language>/).

import { getCollection, type CollectionKey } from "astro:content";
import { isLang, type Lang } from "../i18n";

/** The language of an entry, from the first folder of its id ("sl/welcome"). */
export function entryLang(entry: { id: string }): Lang {
  const [first] = entry.id.split("/");
  if (!isLang(first)) {
    throw new Error(`Content "${entry.id}" is not in a language folder (src/content/<collection>/<language>/).`);
  }
  return first;
}

/** The id without the language: "sl/welcome" gives "welcome". */
export function entrySlug(entry: { id: string }): string {
  return entry.id.split("/").slice(1).join("/");
}


/** Every entry of a collection in one language. */
export async function getEntries<C extends CollectionKey>(collection: C, lang: Lang) {
  const entries = await getCollection(collection);
  return entries.filter((entry) => entryLang(entry) === lang);
}

/** The languages an item exists in, for hreflang and the language switch. */
export async function entryLanguages(collection: CollectionKey, slug: string): Promise<Lang[]> {
  const entries = await getCollection(collection);
  return entries.filter((entry) => entrySlug(entry) === slug).map(entryLang);
}
