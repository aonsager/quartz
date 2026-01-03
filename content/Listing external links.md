---
title: Listing external links
date: 2026-01-02 22:41:00 +09:00
colors:
  - "#c2c2c4"
  - "#2b3e50"
  - "#bbc0ca"
  - "#5a5b5b"
  - "#024c93"
tags:
  - links
  - website
  - emitter
  - obsidian
  - workflow
  - quartz
metaRSS: true
---

I have a page at [[/external-links]] that lists all external sites that I have linked to from this website.

To do this, I created a custom [Emitter](https://quartz.jzhao.xyz/advanced/making-plugins#emitters) that detects all external links as the site is being built. It then outputs a page at [[/external-links]] that lists these links in chronological order, by the date that the linking page was published.

I wanted some kind of linked list as part of my webpage, but I wasn't sure what in format to save the data. This seems like it should work pretty well, because "I cared enough to write about it" is a pretty good heuristic for things that I found interesting. 

And while [Obsidian's web clipper](https://obsidian.md/clipper) never really clicked for me before, using it as a quick way to add a new page to my site and link to the source is a pretty compelling workflow.