import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

// Content is kept per language: src/content/<collection>/<language>/<name>.md.
// The same file name in two languages is the same item translated; its id is
// "<language>/<name>" (src/lib/content.ts splits it).

// Markdown articles under src/content/articles/, read at build time.
const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
  }),
});

// The texts of the privacy policy and the accessibility statement, from the
// shared legal pack: src/content/legal/<language>/privacy.md and
// accessibility.md. The imprint is built from src/site.config.ts.
const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updated: z.coerce.date(),
  }),
});

export const collections = { articles, legal };
