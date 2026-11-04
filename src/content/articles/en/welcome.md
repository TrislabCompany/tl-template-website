---
title: Welcome to the website template
description: How this sample site is built and what to replace first.
published: 2026-10-28
---

This article is a Markdown file in `src/content/articles/en/`. Astro reads it at build time and writes it out as a plain HTML page, so the site needs no server code.

To add an article, add another Markdown file to the folder of its language, with a `title`, a `description` and a `published` date at the top. A file with the same name in `src/content/articles/sl/` is the same article in Slovenian. The home page lists every article in its language, newest first.

To replace the sample, set the site's facts in `src/site.config.ts`, change the pages in `src/pages/[...lang]/`, the shared layout in `src/layouts/BaseLayout.astro` and this content. Keep `/healthz`, `/readyz` and `/config.json` working: the platform relies on them.
