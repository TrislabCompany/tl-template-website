---
title: Sustainability
description: The carbon footprint of this site and what is done to keep it low.
---

**Sample text.** Replace this file with the site's own sustainability page, or switch the page off with `legalPages.sustainability` in `src/site.config.ts`. `pnpm test` checks that the two figures below match the build, so keep them in this form: a number and "KB", a number and "g CO₂e".

## The carbon footprint of this website

| Indicator | Value |
| --- | --- |
| Average page weight | about 135 KB |
| Emissions per page view | about 0.02 g CO₂e |
| JavaScript | none |
| Cookies, trackers, third-party scripts | none |

The figure is calculated with the Sustainable Web Design model, version 4, using the open-source CO2.js library of the Green Web Foundation. It covers the data centre, the network and the visitor's device.

## How the footprint is kept low

- **Static pages.** Every page is prepared in advance and served as a finished file.
- **No tracking.** No cookies, no analytics and no third-party content.
- **A weight budget.** Every change to the website is checked automatically and is rejected if a page grows beyond its budget.
