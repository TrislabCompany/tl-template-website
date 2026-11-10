---
title: Prva vzorčna storitev
summary: Vzorčen element seznama, shranjen kot datoteka Markdown.
order: 1
tags: [vzorec, markdown]
---

Ta element je datoteka Markdown v `src/content/services/sl/`. Astro jo prebere ob gradnji in zapiše kot navadno stran HTML, zato stran ne potrebuje strežniške kode.

Nov element dodate z novo datoteko Markdown v mapi jezika, z `title`, `summary` in `order` na vrhu. Datoteka z istim imenom v `src/content/services/en/` je isti element v angleščini. Seznam in domača stran prikažeta vse elemente v jeziku obiskovalca, najprej tistega z najnižjim `order`.
