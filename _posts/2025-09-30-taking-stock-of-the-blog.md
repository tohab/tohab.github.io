---
layout: post
title: my blog by the numbers
date: 2025-09-30 09:00:00 -07:00
description: null
tags:
- meta
- retrospective
- writing
---

*Note from Rohan: This post was made in collaboration with an LLM (ChatGPT 5). I haven't used an AI to write a blog-post before. The reason I did it for this post in particular is because this post is mostly informative, and not a personal writing piece. It's also not something I'm particularly interested in writing myself, but I still want the information to be out there in the world. I write "in collaboration" with a two caveats: I will declare when I used AI to write a post (by default, I don't use LLMs to write), and I do endorse the content of the post.*


I pulled together a quick statistical round-up of everything currently in the archive (99 published posts, totaling about 77k words). Below are the highlights and the visuals that came out of it.

## Quarterly output

![Quarterly word count and cumulative average for the blog archive.](/assets/img/blog-stats/quarterly-words.png)

*What you're seeing:* the blue bars are the total words published in each calendar quarter. The orange line is the cumulative average words-per-quarter since the blog began in November 2019.

*What stood out to me:*

- Q4 2023 was the most prolific stretch yet with 7,533 words, and Q3 2020 plus Q4 2024 weren't far behind.
- The running average flattens during the Q3 2021 lull (a quarter with no posts) and then picks up again through the 2023-2024 run.
- Across the 2023 calendar year (Q1 through Q4) I logged just under 20k words--my densest four-quarter streak to date.

## Post length distribution

![Histogram of individual post word counts across the archive.](/assets/img/blog-stats/post-length-histogram.png)

Most posts cluster between 400 and 1,000 words (median ~ 650). The histogram tails off into occasional long-form pieces: a handful crack 2,000 words, and the champ tops out at 3,744. On the short side, there are a few ultra-brief updates under 200 words.

## Vocabulary tendencies

![Word cloud of the most common non-stop words used in the blog, sized by frequency.](/assets/img/blog-stats/word-cloud.png)

After stripping out the usual stop words ("the," "a," etc.) plus link detritus and other boilerplate, the standouts tilt toward diary staples: *time, job, taiwan, chinese, friends*. The cloud still shows plenty of first-person voice--*I'm, I've, don't*--which tracks with the personal entries that pop up every few months.

The scripts that generated these charts live in `scripts/generate_blog_stats.py` so we can rerun or extend them whenever the archive grows.
