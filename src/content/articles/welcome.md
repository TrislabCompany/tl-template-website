---
title: Welcome to the website template
description: How this sample site is built and what to replace first.
published: 2026-10-28
---

This article is a Markdown file in `src/content/articles/`. Astro reads it at build time and writes it out as a plain HTML page, so the site needs no server code.

To add an article, add another Markdown file to the same folder, with a `title`, a `description` and a `published` date at the top. The home page lists every article, newest first.

To replace the sample, change the pages in `src/pages/`, the shared layout in `src/layouts/BaseLayout.astro` and this content. Keep `/healthz`, `/readyz` and `/config.json` working: the platform relies on them.
