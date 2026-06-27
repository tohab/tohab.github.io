Create a new blog post from the content the user has provided (or ask them to provide it).

### Step 1 — Discuss with the user before writing the file

1. **Title:** If the user hasn't provided one, ask for it.

2. **Tags:** Suggest 2–5 tags from this list and confirm with the user:
   activism, ai, animal-rights, assorted, balance, belief, china, community, creativity, economics, education, ethics, family, food, founding, grief, health, identity, india, justice, language-learning, music, nature, philosophy, ping pong, poetry, politics, relationships, review, running, social change, strategy, taiwan, teaching, technology, travel, update, work, writing

3. **Grammar/spelling:** List any mistakes you spot and ask if they should be fixed.

Wait for the user's replies before proceeding to Step 2.

### Step 2 — Create the file

Create `_posts/YYYY-MM-DD-title-slightly-abbreviated.md` using today's date unless the user specifies otherwise.

Front matter rules:
- `description` is blank
- `published: true`
- `slug` matches the filename (lowercase, hyphenated)
- `date` and filename date must match

Example front matter:
```
---
date: 2025-01-05
description:
layout: post
published: true
slug: 2025-01-05-my-post-title
tags:
- travel
- identity
title: My Post Title
---
```

Do not wrap the post body in a code fence. Preserve any `---` section breaks from the original content.
