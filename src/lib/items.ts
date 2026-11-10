// Lists of items (the `collections` of src/site.config.ts): sorted lists per
// language, and the static paths of the list pages and the item pages.
import { getCollection, type CollectionEntry, type CollectionKey } from "astro:content";
import { languages, prefixed, type Lang } from "../i18n";
import site from "../site.config";
import { entryLang, entryLanguages, entrySlug, getEntries } from "./content";

/** The collections that hold items: every content collection except the legal texts. */
export type ItemCollection = Exclude<CollectionKey, "legal">;

/** The settings of a list of items, or a build error that names the missing piece. */
export function collectionSettings(id: string) {
  const settings = site.collections.find((collection) => collection.id === id);
  if (!settings) throw new Error(`"${id}" is not in collections in src/site.config.ts.`);
  return settings;
}

export async function sortedItems<C extends ItemCollection>(collection: C, lang: Lang) {
  const entries = (await getEntries(collection, lang)) as CollectionEntry<C>[];
  return entries.sort((a, b) => a.data.order - b.data.order);
}

/** getStaticPaths for /<lang>/<collection>: one list page per collection and language. */
export function collectionPaths() {
  return site.collections.flatMap(({ id }) =>
    languages.map((lang) => ({ params: { lang: prefixed ? lang : undefined, collection: id }, props: { lang, collection: id as ItemCollection } })),
  );
}

/** getStaticPaths for /<lang>/<collection>/<name>: one page per item and language. */
export async function itemPaths() {
  const paths = await Promise.all(
    site.collections.map(async ({ id }) => {
      const collection = id as ItemCollection;
      const entries = await getCollection(collection);
      return Promise.all(
        entries.map(async (entry) => {
          const lang = entryLang(entry);
          const name = entrySlug(entry);
          return {
            params: { lang: prefixed ? lang : undefined, collection: id, id: name },
            props: { entry, lang, collection, available: await entryLanguages(collection, name) },
          };
        }),
      );
    }),
  );
  return paths.flat();
}
