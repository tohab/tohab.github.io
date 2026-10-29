# Rohan Prasad — Website Ops Guide

This fork of the **al-folio** theme powers [rohanprasad.org](https://www.rohanprasad.org), where Rohan publishes essays, artwork, music, and project notes. The upstream README that described the generic theme was removed in favor of this document so future Codex iterations (and human collaborators) can land quickly. The build and release instructions below describe this repository.

## Stack at a Glance

- Static site built with **Jekyll** (Ruby is pinned in `.ruby-version`, currently 3.4.12).
- Theme: [alshedivat/al-folio](https://github.com/alshedivat/al-folio) with custom pages in `_pages/` and many bespoke posts.
- Tooling: Bundler (`Gemfile`), Node (`package.json`) for Prettier, Python 3 for helper scripts (`scripts/*.py`), ImageMagick for asset processing, and Docker Compose (`docker-compose.yml`) for an optional containerized dev loop.
- Deployment: GitHub Actions workflow `.github/workflows/deploy.yml` builds on every push to `main` and deploys via the Pages artifact flow (no `gh-pages` branch push); `bin/deploy` now refuses the retired branch-based path.

## Quick Links (Most-Used Files)

- `README.md` (this guide)
- `_config.yml` (site metadata, nav, toggles, permalinks)
- `_pages/` (top-level pages)
- `_posts/` (blog posts)
- `_layouts/about.liquid` (home/about layout)
- `_sass/_base.scss` (typography + profile styling)
- `_sass/_layout.scss` (collapsible panels + layout)
- `scripts/localize_images.py` (download + relink remote images)
- `scripts/encrypt_secret.rb` (encrypt secret posts)
- `bin/sync_archives.rb` (rebuild tag/year pages)
- `.github/workflows/deploy.yml` (GitHub Pages deploy)

## Where to Edit What

- Navigation labels/URLs: `_config.yml`
- About page layout + profile image wrapping: `_layouts/about.liquid` + `_sass/_base.scss`
- Collapsible panel styling/behavior: `_sass/_layout.scss` + `assets/js/collapsible-panels.js`
- Footnote tooltips: `assets/js/footnotes.js` + `_sass/_layout.scss`
- Blog hover previews: `_includes/scripts/blog_hover_preview.liquid` + `assets/js/blog-hover-previews.js`
- Secret posts list + unlock UI: `_pages/secret.md` + `_layouts/secret_post.html`
- Game gallery + game pages: `_pages/etc-games.md` + `_layouts/games.liquid` + `_layouts/game.liquid`

## Getting Started

### Prerequisites

| Tool | Why | Notes |
| ---- | --- | ----- |
| Ruby 3.4.12 + Bundler 2.6.9 | Run Jekyll locally | Match the deployment workflow's Ruby version. Install via `rbenv`, `asdf`, or system package manager. |
| Node.js 22+ & npm | JavaScript syntax checks + Prettier | Run `npm ci` once to install dependencies in `package.json`. |
| Python 3.10+ | Repo scripts (`scripts/*.py`) | Install packages with `python3 -m pip install -r requirements.txt` and `pip install pillow pyyaml` (needed for the image and stats scripts). |
| ImageMagick (`convert`) | Downscale & optimize artwork | Homebrew: `brew install imagemagick`; Debian/Ubuntu: `sudo apt install imagemagick`. |
| Optional: Docker | Run `docker compose up` for a self-contained dev server | Uses the provided `Dockerfile` and `docker-compose.yml`. |

### Initial setup

```bash
git clone git@github.com:tohab/tohab.github.io.git
cd tohab.github.io
gem install bundler -v 2.6.9
bundle install
npm ci
python3 -m pip install -r requirements.txt pillow pyyaml
```

### Running the site locally

The standard dev loop is:

```bash
bash bin/build
bundle exec jekyll serve --livereload
```

- Visit `http://127.0.0.1:4000`.
- Livereload watches `_pages`, `_posts`, `_sass`, `_layouts`, `_includes`, `_data`, and most assets. Restart the server if you touch `_config.yml` or `_plugins`.
- Stop with `Ctrl+C`. If you see stale layouts, run `bundle exec jekyll clean` before restarting.

**Docker option:** `docker compose up --build` uses the same Ruby version and locked gems, generates archives, and serves on `http://127.0.0.1:8080` with livereload. Rebuild the image after changing the Gemfile or lockfile. Restart after changing `_config.yml` or `_plugins`. The compatibility `docker-compose-slim.yml` uses the same build.

### Build and release checks

```bash
bundle exec ruby tests/check_site_test.rb
bash bin/build
bundle exec ruby scripts/check_site.rb
```

Every pull request runs these checks. They verify core routes, eight-post pagination, internal link targets, inline JavaScript syntax, excluded development/private files, and exact preservation of the encrypted `/rcg` payload. PRs never deploy; a successful main-branch run publishes through Pages. The external-link audit remains a separate manual workflow because third-party sites can block CI requests.

The root npm dependencies remain formatting tools. RCG's browser code, encryption, and assets are owned by its separate workstream; this build migration does not add, update, or bundle its JavaScript dependencies. See [build validation](docs/build-validation.md) for scope and known limitations.

## Repository Layout (What You Actually Need)

| Path | Purpose |
| ---- | ------- |
| `_config.yml` | Single source of truth for metadata, navigation labels, permalink format (`/blog/:year/:title/`), hover previews, analytics toggles, etc. |
| `_pages/` | Top-level pages (home, resume, art, work, etc.). Each file declares a `permalink` to control routing. |
| `_posts/` | Blog posts in `YYYY-MM-DD-title.md` format. Individual front matter (`slug`, `preview_image`, `tags`) drives indexes, hover cards, and image folders. `description` is optional and only used when non-empty (`_includes/metadata.liquid`, `_includes/scripts/blog_hover_preview.liquid`). |
| `_projects/`, `_news/`, `_bibliography/` | Extra collections that render on dedicated layouts. |
| `_games/` | Self-contained JavaScript mini-experiences. Each file includes front matter + JS body and is rendered via `_layouts/game.liquid` at `/etc/games/<name>/`. |
| `_generated/tag` & `_generated/year` | Archive landing pages generated by `bin/sync_archives.rb`. Do not edit by hand. |
| `_data/` | YAML data for CV sections, repos, and venues. |
| `_sass/`, `_layouts/`, `_includes/` | Theme customizations. `_sass/_layout.scss` currently defines page scaffolding. |
| `assets/img/posts/<slug>/` | Optimized PNGs that ship with the site. Each post owns a folder named after its `slug`. |
| `assets/img/raw/<slug>/` | Gitignored source imagery (keeps high-res originals without bloating Git history). |
| `scripts/` | Custom automation (`localize_images.py`, `generate_blog_stats.py`). |
| `bin/` | Operational helpers (`cibuild`, `deploy`, `sync_archives.rb`). |
| `docs/`, `FAQ.md`, `INSTALL.md`, `CUSTOMIZE.md` | Upstream al-folio references for deeper theme tweaks. |

## Work Page Collapsible Toggles

The work page (`_pages/work.md`) uses `<details class="collapsible-panel work-case">` panels. The styling lives in `_sass/_layout.scss` under `.collapsible-panel`. Two CSS custom properties make the visuals easy to toggle:

- `--collapsible-panel-border`: Controls the panel border. It is set to `none` for work cases to remove the border. Restore the old look by setting it to `2px solid #000`.
- `--collapsible-panel-triangle-display`: Controls the triangular bullet next to each summary. It is set to `inline-block` for work cases (showing the triangle). Turn it off by setting it to `none`.

The triangle rotates when the panel opens (via the `[open]` attribute) and respects reduced motion settings.

**Typography gotcha:** `_sass/_base.scss` sets `font-size: 1.08em` on `p`, `div`, and most text elements, so nested markdown (like `div > p`) compounds to ~1.17em. Collapsible panels force inheritance to avoid runaway scaling; if panels look smaller than surrounding text, it is usually because the surrounding content is already compounded.

## Content Workflow

### Posts

1. Create `_posts/YYYY-MM-DD-my-title.md`.
2. Add front matter like:

```yaml
---
layout: post
title: rain, rain come again
date: 2025-10-13
slug: 2025-10-rain-rain-come-again   # used for asset folders
tags: [nature, reflection]
preview_image: /assets/img/posts/2025-10-rain-rain-come-again/img01.png
---
```

- `slug` must match the folder under `assets/img/posts/` (automation depends on this).
- `preview_image` populates Open Graph + blog hover cards (if you flip `blog_hover_preview.enabled` in `_config.yml`).
- `description` is optional; `_includes/metadata.liquid` and `_includes/scripts/blog_hover_preview.liquid` only use it when non-empty, so leave it blank or `null` (or omit it) to keep default behavior.
- `published: false` keeps drafts out of production while still allowing local preview.
- Tags feed both inline metadata and the generated archive pages.

#### Post Creator prompt

`_posts/post-creator.md` stores the Codex instructions for generating draft posts from plain Markdown. When you invoke the “post creator” helper, give it raw Markdown body text as **Input**. The **User-discussion** step asks the AI to suggest tags from this approved list (activism, ai, animal-rights, assorted, china, community, creativity, economics, education, ethics, family, food, grief, health, identity, india, justice, language-learning, music, nature, philosophy, ping pong, poetry, politics, relationships, review, running, social change, taiwan, teaching, technology, travel, update, work, writing) and to call out any explicit grammar or spelling mistakes so you can confirm fixes before saving.

The helper outputs a Markdown file with full Jekyll front matter (file name `YYYY-MM-DD-title-slightly-abbreviated.md`). The template it follows is:

```yaml
---
date: 2025-01-05
description: null
layout: post
published: true
slug: YYYY--add-appropriate-title
tags:
  - ethics
  - social change
  - ai
  - technology
title: Add A Title Here
---
```

Edit the placeholder date/title/slug/tags before committing, and delete `description` (or leave it blank/`null`) if you do not want a custom summary.

### Front matter conventions (by content type)

- Posts (`_posts/*.md`): `layout: post`, `title`, `date`, `slug`, `tags`, optional `preview_image`, optional `description`, optional `published: false`.
- Projects (`_projects/*.md`): Use `layout: page` (see sample files in `_projects/`); cards are rendered by `_pages/projects.md` via `_includes/projects*.liquid`.
- News (`_news/*.md`): Uses `layout: post` by default (see `_config.yml` collections).
- Games (`_games/*.js`): `layout: game`, `title`, `summary`, plus the embed fields (`element_tag`, `element_id`, etc.).

#### Inline footnotes

Use standard Markdown/Kramdown footnotes anywhere (posts, `_pages/*.md`, etc.) and the site will automatically turn them into clickable tooltip bubbles (no list at the bottom of the page):

```markdown
This line has some extra context[^about-origin].

[^about-origin]: The bubble can render Markdown—links, _italics_, **bold**, etc.
```

Footnote definitions can live at the bottom of the same file (like any other Markdown footnote). They never render inline as a list—the JavaScript enhancer (`assets/js/footnotes.js`, loaded from `_includes/scripts/misc.liquid`) removes the generated `<div class="footnotes">` and only leaves the tooltip bubbles—so you can tuck those definitions near the end just for editorial clarity.

Key behaviors and tips:
- Footnotes work on _any_ Markdown file that Jekyll processes (posts, `_pages`, collections, etc.).
- The tooltip replaces the superscript list entirely—click/tap the `[n]` to reveal the note and click elsewhere (or press `Esc`) to close it.
- Because the superscript stays in-flow, keep notes short (1–3 sentences) so the bubble doesn’t cover large chunks of text.
- Styling inherits the site’s light/dark palette, so no additional front matter flags are needed.

> **Heads‑up:** the site runs Kramdown with `input: GFM`, so the shortcut syntax `^[inline note]` is ignored. Always reference footnotes via `[^note_id]` + a definition block as shown above.

#### Blog hover previews (optional)

There is an optional hover preview that shows the first lines of a blog post when a link points to a local blog URL (including `rohanprasad.org`).

How it works:
- Toggle it in `_config.yml` via `blog_hover_preview.enabled` (currently set to `false`).
- Previews pull `preview_image` or `thumbnail` if present; otherwise they show text only.
- The summary is `description` if provided, else a truncated excerpt of the post body.
- The hover card only shows on pointer/hover devices; it is disabled on touch-first screens.
- The shared data + styles live in `_includes/scripts/blog_hover_preview.liquid`, and the behavior lives in `assets/js/blog-hover-previews.js`.

### Secret posts (password-gated content)

Password-protected essays are encrypted before publication; keep plaintext drafts out of Git history:

1. **Draft in `secret_plain/` (gitignored).** Example scaffold:
   ```markdown
   ---
   layout: secret_post        # keeps previews consistent locally
   title: encrypted test
   date: 2024-05-16
   permalink: /secret/encrypted-test/
   secret_key: your-passphrase-here  # passphrase you’ll share with readers
   ---

   Write the actual post body here in normal Markdown.
   ```
   - `secret_key` stays in the plaintext file only. Each post can pick its own passphrase.
   - Leave the public `secret/` folder alone—files there are generated.

2. **Encrypt + publish.** After editing a plaintext file, re-run the helper:
   ```bash
   bundle exec ruby scripts/encrypt_secret.rb secret_plain/encrypted-test.md
   ```
   The script:
   - Parses front matter, renders Markdown → HTML, and derives an AES-256-GCM key from `secret_key` using PBKDF2 (210k iterations, SHA-256).
   - Writes `secret/encrypted-test.md` with public metadata plus `layout: secret_post`, `encrypted: true`, `kdf`, `salt`, `iv`, `tag`, and `ciphertext` fields; the body is ciphertext and no plaintext remains in the repo.
   - Overwrites any existing encrypted file, so rerun it whenever you change content *or* the password.

3. **Serving + unlock flow.**
   - `_pages/secret.md` lists every post inside `secret/`.
   - Each entry uses `_layouts/secret_post.html`, which shows a prominent “enter passcode for this post” form. The browser derives the same key client-side (WebCrypto) and decrypts the HTML only when the correct passphrase is entered.
   - Wrong passwords simply display an inline error; nothing leaks because the ciphertext stays encrypted at rest.

4. **Safety checks.**
   - These are encrypted static pages, not server-side access control. Their metadata and ciphertext are public, and anyone with the passphrase can decrypt and keep a copy. Use a strong, unique passphrase shared separately, and do not use this feature for information that needs revocable access or account-level permissions.
   - Never commit files under `secret_plain/` (already gitignored).
   - If you need to rotate a password, update `secret_key` in the plaintext file and rerun the script—this regenerates the salt, IV, and ciphertext automatically.
   - For extra assurance run `git diff secret/` to verify only opaque metadata changed.

### Pages, Resume, and Collections

- `_pages/*.md` drive navigation. The front matter `permalink` decides the URL (`permalink: /about/`, `permalink: /blog/`, etc.).
- `_pages/blog.md` lists posts and surfaces inline preview cards; `_pages/work.md`, `_pages/art.md`, etc. each call into layouts under `_layouts/`.
- The home/about layout (`_layouts/about.liquid`) wraps the profile image and page content in `.about-content.clearfix` so text wraps beside the floated image and then expands full-width once it clears the image. Adjust float direction via `profile.align` in front matter and sizing in `_sass/_base.scss` (`.profile`).
- `_projects` and `_news` behave like mini-blogs using their own layouts; drop Markdown files with the relevant metadata.
- `_bibliography` + `_bibliography/references.bib` (if present) work with `jekyll-scholar` should you need publications.
- `_data/cv.yml`, `_data/coauthors.yml`, `_data/repositories.yml`, and `_data/venues.yml` feed the resume and publication components.

### About Page Collapsible Text Flow

The about page uses `<details class="collapsible-panel work-case">` panels inside `.about-panel-stack` to keep the dropdown styling consistent with the work page. To allow the open panel text to wrap around the floated profile image (and then expand to full width below the image), `_sass/_layout.scss` sets `overflow: visible` on `.about-panel-stack .collapsible-panel__content` when the panel is open. The collapse animation still needs `overflow: hidden`, so that rule is re-enabled while the panel is closed or animating (`[data-animating="true"]`). This preserves the smooth height animation while letting the open text flow like normal body content.

### Interactive games

`_pages/etc-games.md` (layout in `_layouts/games.liquid`) renders a grid of cards that link to each game page. Each `_games/*.js` entry is rendered with `_layouts/game.liquid`, which builds the embed markup and inlines the JS body inside a `<script>` tag. The permalink pattern lives in `_config.yml` under `collections.games` (currently `/etc/games/:name/`).

To add or update a game:

1. Create `_games/<slug>.js`.
2. Add front matter describing the embed target and metadata:

   ```yaml
   ---
   layout: game
   title: rainbow ragdoll playground
   summary: one-line description shown on the game detail page
   element_tag: canvas            # defaults to div
   element_id: ragdoll-simulator  # optional but usually needed so the script can `getElementById`
   element_class: embed-responsive-item
   element_role: img
   element_aria_label: Interactive ragdoll simulation
   aspect_ratio: embed-responsive-4by3  # Bootstrap ratio helper class
   order: 10                            # lower numbers appear first on /etc/games/
   ---
   (() => {
     // your game JS, typically wrapped in an IIFE
   })();
   ```

3. No manual HTML edits are required; new files appear on `/etc/games/` and render at `/etc/games/<slug>/`.

## Image & Media Pipeline

Central rule: every published post keeps artwork in `/assets/img/posts/<slug>/`. Two methods exist to get there.

### Localizing remote placeholders

While drafting it is fine to paste remote images. Before publishing, run:

```bash
python3 scripts/localize_images.py _posts/2025-10-13-rain-rain-come-again.md
# or omit the argument to scan all posts
```

What it does:

1. Scans Markdown for `![alt](https://remote...)` (and linked images).
2. Downloads each image under `assets/img/raw/<slug>/imgNN.ext` (preserving an untouched original; folder is gitignored).
3. Uses ImageMagick `convert` to create a web-ready PNG in `assets/img/posts/<slug>/imgNN.png` (auto-orient, strip metadata, max 1800px).
4. Rewrites the Markdown in-place to use `/assets/img/posts/<slug>/imgNN.png`.

Flags:

- `--dry-run` shows what would change.
- `--force` redownloads/reprocesses existing assets.
- `--max-size` overrides the default 1800px cap.

Dependencies: Python 3, PyYAML, ImageMagick (`convert` must be on your PATH), and outbound network access for the downloads.

### Adding local artwork manually

1. Drop master files (RAW photos, PSDs, etc.) into `assets/img/raw/<slug>/`.
2. Export/convert into PNGs sized ≤1800px on the long edge and place them inside `assets/img/posts/<slug>/`.
3. Reference them in Markdown via `![](/assets/img/posts/<slug>/your-name.png)`.

The raw directory stays out of Git (see `.gitignore`) so commits only include optimized PNGs.

## Automation & Helper Scripts

| Command | Purpose | Notes |
| ------- | ------- | ----- |
| `bin/sync_archives.rb` | Rebuilds `_generated/tag` and `_generated/year` pages by scanning `_posts`. | GitHub Actions runs this on deploy, but run it locally after adding posts or renaming tags when previewing new tags or years; `_generated/` is build output and is not committed. |
| `python3 scripts/localize_images.py …` | See “Image & Media Pipeline” above. | Install PyYAML + ImageMagick. |
| `python3 scripts/generate_blog_stats.py` | Produces `/assets/img/blog-stats/*.png` charts and a `summary.txt` describing totals. | Requires Pillow and the `DejaVuSans.ttf` font (install via `sudo apt install fonts-dejavu` or equivalent). Useful when updating posts like `_posts/2025-09-30-taking-stock-of-the-blog.md`. |
| `bin/cibuild` | Compatibility wrapper for `bash bin/build`. | Used by some CI workflows. |
| `bash bin/build` | Generates archives and runs a production Jekyll build. | Shared by local builds and CI. |
| `bin/deploy` | Retired; exits without changing files or branches. | Publish through the Pages workflow. |

## Formatting, Checks, and Tooling

- **Build check:** `bash bin/build && bundle exec ruby scripts/check_site.rb` (or use `bin/cibuild` for the build).
- **Prettier:** Liquid and Markdown formatting is standardized via Prettier 3 with the Shopify Liquid plugin. Run `npx prettier --write _layouts/ _includes/ _pages/ _posts/ _sass/`.
- **Pre-commit:** `.pre-commit-config.yaml` provides whitespace/yaml/large-file hooks. Opt in with `pre-commit install` and run `pre-commit run --all-files` before pushing.
- **CSS/media optimization:** Existing responsive image variants are used where available. Automatic image generation and HTML/JavaScript minification are deliberately excluded from this first build migration; they require a separate compatibility/performance pass.
- **Python tooling:** `requirements.txt` currently lists `nbconvert` (used for notebook-to-Markdown conversions). Install Pillow + PyYAML as mentioned earlier for the scripts.

## Deployment

- **GitHub Pages (default):** `.github/workflows/deploy.yml` validates pull requests and publishes successful pushes to `main`, using `.ruby-version`, `Gemfile.lock`, `bash bin/build`, and the artifact-based Pages workflow. The site is served at https://www.rohanprasad.org.
- **Manual rerun:** Use the repository's Actions tab to rerun "Deploy Jekyll site to Pages" on `main`. The old `gh-pages` force-push script is retired.
- **Other hosting:** `bash bin/build --destination path/to/output` will write a static bundle to `_site/` (or the provided destination). Remember to set `_config.yml`’s `url`/`baseurl` before building for custom domains/subpaths.

## Troubleshooting & Tips

- **“Missing layouts/data” errors:** Usually solved by `bundle exec jekyll clean && bundle exec jekyll serve`.
- **Broken archive/tag pages:** Run `bash bin/build` to regenerate `_generated/`; do not commit generated files.
- **ImageMagick `convert` failures:** Ensure the binary is available (`which convert`). macOS users on Apple Silicon sometimes need `brew install imagemagick` and to restart their shell.
- **Blog stats script font errors:** Install the DejaVu font family (`sudo apt install fonts-dejavu` or `brew install --cask font-dejavu-sans`).
- **More theme help:** See `CUSTOMIZE.md`, `FAQ.md`, `INSTALL.md`, and the upstream [al-folio documentation](https://github.com/alshedivat/al-folio). This repo follows the upstream layout closely, so their guidance usually applies verbatim.

With this context you should be able to spin up the site, add or edit posts, wrangle assets, and ship changes with confidence. Happy writing! 
