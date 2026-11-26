# Homepage portrait source digest

- **Workload:** The live homepage loads `assets/img/prof_pic.png` as its eager profile portrait. Browser readback measured the PNG at 1024×1536 and 2,816,355 bytes.
- **Current rendering:** `_layouts/about.liquid` passes the portrait through `_includes/figure.liquid` with responsive `sizes`. `figure.liquid` already discovers matching `assets/img/<name>-<width>.webp` static files and emits a WebP `srcset`; the `<img>` continues to reference the original PNG fallback. No matching variants currently exist.
- **Experiment:** Create only `assets/img/prof_pic-480.webp` and `assets/img/prof_pic-800.webp`, preserving the source image's composition, transparency, colors, and detail. Do not edit the PNG, templates, or page content.
- **Evaluation:** The harness compares the largest responsive candidate's bytes with the target of ≤350,000 bytes and checks that the portrait and PNG fallback remain available. Inspect the source and both generated variants visually. The local Jekyll build cannot run because Bundler/Jekyll are not installed; live HTML source selection can only be verified after deployment.
- **Constraints:** No new packages or paid services. ImageMagick is already installed locally. Preserve the original fallback and responsive sizing behavior.
