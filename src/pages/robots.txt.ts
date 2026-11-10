// /robots.txt of a site that may be indexed: search engines and AI answer
// engines may read the site; crawlers that only collect text to train AI
// models may not. The sitemap is named with the site's own address.
//
// This is the file of an indexable site. A deploy to any Environment other
// than production, or to production before ROBOTS_INDEX is "true", replaces it
// with "Disallow: /" and deletes the sitemap (scripts/write-config.mjs,
// docs/deployment.md#search-engines): nothing here can open dev or staging.
//
// robots.txt is a request, not a lock: well-behaved crawlers follow it.
import type { APIRoute } from "astro";
import site from "../site.config";

// Training crawlers, each with its operator's documented user agent. Remove a
// line to allow that crawler; add one to block another.
const trainingCrawlers = [
  "GPTBot", // OpenAI, training (OAI-SearchBot and ChatGPT-User stay allowed)
  "ClaudeBot", // Anthropic, training (Claude-SearchBot and Claude-User stay allowed)
  "Google-Extended", // Google, Gemini training; Googlebot stays allowed
  "Applebot-Extended", // Apple, training; Applebot stays allowed
  "CCBot", // Common Crawl, a common training source
  "meta-externalagent", // Meta, training
  "Bytespider", // ByteDance, training
];

export const GET: APIRoute = () => {
  const lines = [
    ...trainingCrawlers.flatMap((agent) => [`User-agent: ${agent}`, "Disallow: /", ""]),
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${new URL("/sitemap-index.xml", site.url).toString()}`,
  ];
  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
