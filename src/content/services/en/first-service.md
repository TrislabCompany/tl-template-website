---
title: First sample service
summary: A sample item of a list, kept as a Markdown file.
order: 1
tags: [sample, markdown]
---

This item is a Markdown file in `src/content/services/en/`. Astro reads it at build time and writes it out as a plain HTML page, so the site needs no server code.

To add an item, add another Markdown file to the folder of its language, with a `title`, a `summary` and an `order` at the top. A file with the same name in `src/content/services/sl/` is the same item in Slovenian. The list page and the home page show every item in its language, lowest `order` first.

To make another list, such as news or products, follow "Lists of items" in `docs/site-settings.md`.
