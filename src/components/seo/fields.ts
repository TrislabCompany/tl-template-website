// Optional search fields for the front matter of an item (src/content.config.ts):
//
//   searchTitle: A shorter or different title for search results and sharing
//   shareImage: ../../../assets/photo.jpg   (relative to the Markdown file)
//   shareImageAlt: What the photo shows, in the item's language
//   noindex: true                           (left out of search and the sitemap)
//
// Spread them into a collection's schema: schema: ({ image }) => z.object({ ..., ...seoFields(image) }).
// Shared with the template (template-manifest.yaml): a release may add fields.
import type { ImageMetadata } from "astro";
import type { SchemaContext } from "astro:content";
import { z } from "astro/zod";

export function seoFields(image: SchemaContext["image"]) {
  return {
    searchTitle: z.string().optional(),
    shareImage: image().optional(),
    shareImageAlt: z.string().optional(),
    noindex: z.boolean().default(false),
  };
}

/** The SeoHead.astro props of an item with these fields. */
export function seoProps(data: { title: string; searchTitle?: string; shareImage?: ImageMetadata; shareImageAlt?: string; noindex: boolean }) {
  return {
    title: data.searchTitle ?? data.title,
    noindex: data.noindex,
    image: data.shareImage && { src: data.shareImage, alt: data.shareImageAlt ?? "" },
  };
}
