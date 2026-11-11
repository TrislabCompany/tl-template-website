import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import { seoFields } from "./components/seo/fields";

// Content is kept per language: src/content/<collection>/<language>/<name>.md.
// The same file name in two languages is the same item translated; its id is
// "<language>/<name>" (src/lib/content.ts splits it). The language of the
// source text and the others, as drafts from it, are the site's choice.

// One page per item: /<lang>/services/<name>. A list of items is a collection
// here and an entry in `collections` in src/site.config.ts, under the same id.
// To add another list (news, products, cases…), copy this block, give it its
// id, add it to `collections` below and to src/site.config.ts. Add fields to
// the schema as the items need them: a date, an image, a category. The search
// fields (a search title, a share image, noindex) are in seoFields.
const services = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/services" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      /** Position in lists, lowest first. */
      order: z.number().int(),
      tags: z.array(z.string()).default([]),
      ...seoFields(image),
    }),
});

// The texts of the privacy policy, the accessibility statement and the
// sustainability page: src/content/legal/<language>/privacy.md,
// accessibility.md and sustainability.md. The imprint is built from
// src/site.config.ts. The pages show no date: no law asks for one, and a date
// that is not kept up to date does more harm than good.
const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { services, legal };
