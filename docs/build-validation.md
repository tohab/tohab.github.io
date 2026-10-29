# Build migration and RCG compatibility

This change moves compilation from the restrictive github-pages gem to an explicit
Jekyll build. GitHub Pages remains the static host. Ruby is pinned by .ruby-version;
Gemfile.lock records the complete resolved dependency graph. Dependabot covers gems.

Run `bundle exec ruby tests/check_site_test.rb`, `bash bin/build`, and
`bundle exec ruby scripts/check_site.rb` before opening a PR. The deploy workflow
runs the same checks and only uploads/deploys on main after they pass.

## RCG ownership boundary

The migration does not edit `_pages/rcg.md`, `_layouts/encrypted_gallery.html`, or
RCG assets. It does not change package.json, package-lock.json, browser libraries,
key derivation, encryption parameters, or the encrypted payload. The build check
compares the rendered gallery's encrypted JSON against the current source page,
without decrypting it, and checks its sitemap exclusion. It supports both inline
JSON (the current house viewer, including compression metadata) and the older
front-matter payload format.
It follows the source metadata, so a later intentional gallery update remains valid.

That check proves build preservation, not successful password unlock or rendering
inside the encrypted content. Those remain the RCG workstream's runtime checks.
Rebase this branch onto current main before merge and rerun validation if the gallery
changes. Never copy uncommitted changes from another agent's checkout.

## Deliberate scope limits

- Image generation and HTML/JS minification remain off during this migration. Existing
  responsive image files are retained. They need their own performance/compatibility pass.
- Internal file targets and inline JavaScript syntax block publishing. External links
  have a separate manual audit, without suppressed failures, because external services
  can return bot-blocking responses. This does not assert all external links are healthy.
- All internal targets in rendered page links, image/script sources, stylesheets,
  and iframe sources must exist. There is no missing-link allowlist.
- A pre-write hook rejects duplicate output destinations. The unused profiles theme
  sample is excluded because it also claimed /work/.
- Source assets embedded in CSS or in runtime-generated JavaScript are not fully crawled.
- Docker configuration uses the same Ruby/gems, but must also be built on a Docker host.

## First-pass validation recorded on 2026-10-28

- Ruby 3.4.12 / Jekyll 4.4.1 production build: passed.
- Build checker regression tests: passed.
- Rendered-site checks (pagination, internal links, inline JavaScript syntax,
  excluded files, RCG ciphertext and sitemap preservation): passed.
- actionlint 1.7.12, shell syntax, and git diff whitespace checks: passed.
- RCG page/layout and root npm manifests: byte-for-byte unchanged from base.
- Full browser smoke test: not completed; no browser executable was installed,
  and the browser download repeatedly returned a truncated archive.
- Docker build: not run; this host has no Docker runtime.
- Remote PR/CI: blocked by repository write access. Native Git has no push
  credential and the connected GitHub identity cannot create this repo's refs.
  The tested changes are committed locally on codex/site-build-reliability.

## Publication review on 2026-10-28

- Recovered the first-pass patch and applied it cleanly to main at
  `adefd718fd2fdd56897b9ebb1ac3f2747f460473`.
- Fixed a checker compatibility failure exposed by the current RCG page: its
  payload is inline JSON, rather than the older front-matter format. Regression
  coverage checks both formats and rejects changed compression metadata.
- Installed the locked dependencies with Ruby 3.4.12; regression tests, production
  build, generated-site checks, actionlint 1.7.12, shell syntax, and whitespace
  checks passed. Existing Sass deprecation warnings remain non-blocking.
- Desktop browser smoke checks passed for homepage rendering and expansion,
  eight-post pagination and page-two navigation, graph rendering and node
  selection, and the locked RCG view. No authorized RCG unlock or mobile browser
  test was performed in this review.
- RCG sources, encrypted data, assets, and root npm manifests remain unchanged.
- Docker build remains untested because no Docker runtime is available.
- The user explicitly authorized publication through the existing owner browser
  session. Standard GitHub uploads avoid granting the broader OAuth scopes
  requested by the VS Code editor. Shell entry points explicitly invoke Bash
  so uploaded files do not depend on executable mode being retained.
