---
date: 2025-09-29
description:
layout: post
published: false
slug: 2025-09-29-so-you-want-to-make-a-website
tags:
- tech
title: so you want to make a website
---

*Note from Rohan: This post was made in collaboration with an LLM (ChatGPT 5). I haven't used an AI to write a blog-post before. The reason I did it for this post in particular is because this post is mostly informative, and not a personal writing piece. It's also not something I'm particularly interested in writing myself, but I still want the information to be out there in the world. I write "in collaboration" with a two caveats: I will declare when I used AI to write a post (by default, I don't use LLMs to write), and I do endorse the content of the post.*

If you want to build a personal website and keep it under your control, here's the approach that has worked for me.

### Start with a template you can customize
- I use the [al-folio theme](https://github.com/alshedivat/al-folio) as the base. I forked it so I could edit files directly in my own repository.
- Working on [GitHub](https://github.com/) gives me full ownership. Every change is tracked, and I can roll forward or back without waiting on a platform update.
- Treat the theme as a starting point. Remove sections you don't need, add layouts you do, and expect to keep adjusting as you learn what the site should do.

### Understand the hosting stack
- The site runs on [GitHub Pages](https://pages.github.com/) with [Jekyll](https://jekyllrb.com/).
- ELI5 version: GitHub Pages is the librarian that places your Markdown files on the web for free. Jekyll is the translation engine—it reads those Markdown files, applies the theme, and produces static HTML that loads quickly.
- Once the repository is configured, publishing is as easy as merging a pull request. No servers to monitor.

### Point a custom domain
- I purchased the domain on [Namecheap](https://www.namecheap.com/). Their dashboard makes DNS updates straightforward.
- After buying the domain, configure the A records and CNAME to point at GitHub Pages. GitHub's documentation walks through the exact values; it takes about 10 minutes the first time.

### Edit locally, not in the browser
- I write and configure everything in [Visual Studio Code](https://code.visualstudio.com/). Having the text editor, file tree, and Git tools in one place keeps the workflow simple.
- Keep posts in Markdown and version-control everything. It makes diffs easy to review later.

### Use AI as an accelerator
- I pair program with [Codex](https://openai.com/blog/openai-codex) and [OpenAI's GPT-5](https://openai.com/). When I'm unsure how to change a layout or tweak SCSS, I describe the goal and let the model draft the change.
- The models are good at proposing complete snippets. My job is to review, edit, and commit the parts that make sense.
- A quick story: this summer I broke the navigation and was stuck on 404s for days. Codex produced the fix in one pass. It was a reminder that these tools can unblock you when you hit the edge of your experience.

### Why I recommend this path
- You learn how static sites work while still relying on mature tooling.
- The stack is inexpensive: GitHub Pages is free, Jekyll is open-source, and a domain costs the price of a mediocre dinner once a year.
- Even if you only dig into the code occasionally, the combination of Git history and AI assistance makes changes approachable.

If you're willing to tinker, this setup gives you a durable home for your writing and a hands-on lesson in how the web is put together.
