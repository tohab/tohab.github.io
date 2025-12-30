### Goal
Create a new blog post in `_posts/` using the text the user provides.

### Input
A plain text Markdown file with blog post contents.

### User discussion
1) Suggest 2-5 tags you think apply for the post from this list:
activism
ai
animal-rights
assorted
china
community
creativity
economics
education
ethics
family
food
grief
health
identity
india
justice
language-learning
music
nature
philosophy
ping pong
poetry
politics
relationships
review
running
social change
taiwan
teaching
technology
travel
update
work
writing

2) List any explicit grammar/spelling mistakes you spot and ask if they should be changed.

### Output
Create a Markdown file with YAML front matter and the post body.

Rules:
- File path: `_posts/YYYY-MM-DD-title-slightly-abbreviated.md`.
- Use today's date unless the user provides a specific date.
- Keep the filename date in sync with the front matter date.
- `description` should be empty (leave blank).
- `published: true`.
- `slug` should match the filename (lowercase, hyphenated).
- Do not wrap the post in a code fence.

Example front matter:
---
date: 2025-01-05
description:
layout: post
published: true
slug: 2025-01-05-add-appropriate-title
tags:
- ethics
- social change
- ai
- technology
title: Add A Title Here
---
