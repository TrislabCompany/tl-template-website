import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

// Markdown articles under src/content/articles/, read at build time.
const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
  }),
});

export const collections = { articles };
