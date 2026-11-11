// The share image of a site or a page (SeoHead.astro). Shared with the
// template (template-manifest.yaml): a release may change it.
import type { ImageMetadata } from "astro";

export interface ShareImage {
  /** An imported image (import photo from "../assets/photo.jpg"), cropped to 1200 × 630 at build. */
  src: ImageMetadata;
  /** What the picture shows: one text per language, or one text for the page's language. */
  alt: string | Record<string, string>;
}
