# Homepage portrait speed strategy digest

## Categories tried

- `preprocessing`: 1 success, 0 failures. Added pre-generated WebP sizes already recognized by the site's responsive Liquid template and width configuration.

## Current best

- Largest responsive portrait payload: **48,920 bytes**, down from **2,816,355 bytes** (2,767,435 bytes / 98.26% lower; 57.6× smaller).
- Target: ≤350,000 bytes; met.
- Both image variants and PNG fallback are present. The source image is fully opaque; visual inspection showed full framing and similar color/detail. PSNR against high-quality Lanczos-resized references was 35.75 dB (480px) and 35.64 dB (800px).
- The winning files are committed on `optimize/homepage-portrait-speed` at `9c6264f`.

## Learnings and remaining opportunities

- `_config.yml` already lists 480px and 800px responsive widths, and `_includes/figure.liquid` discovers matching generated files. Adding the two named WebP assets activates that existing behavior while leaving the original PNG `<img>` fallback intact.
- This experiment measures the portrait payload only. Other homepage assets may offer further savings, but their transfer share and runtime cost are not attributed here; estimates remain unknown and need a fresh browser/network measurement before choosing another change.
- Local Jekyll/Bundler are unavailable in this environment. Source inspection and static asset validation passed, but the rendered deployed `srcset` and browser-selected image are not verified until the branch is published and the live page is checked.

## Failure patterns

- None observed in the one experiment. No failure or judge cases were recorded.
