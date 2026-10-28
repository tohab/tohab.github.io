# RCG viewer maintenance

`viewer.min.js` is the prebuilt browser module; `viewer.js` and `house-model.js` are its editable source. Three.js 0.186.1 is bundled, including OrbitControls; no third-party CDN is needed. See `LICENSE-three.txt`.

House-specific coordinates and photographic references live in an **encrypted private JSON payload**, not in these public modules. Keep private plans, originals, model exports and passwords out of this repository. The encrypted page and `gallery.enc` use AES-256-GCM / PBKDF2-SHA256, 600,000 iterations, fresh salt and distinct nonces. Only the generic renderer is public. Passwords are requested during packaging and are never saved.

## Updating the reconstruction

1. Open the private reconstruction checkpoint or unlock the page and choose **About this reconstruction → Download editable plan**. Preserve stable room IDs and photo IDs.
2. Revise room `outline` polygons, wall endpoints and opening endpoints in metres. Update `floors`, `stairs`, `roofs`, `view`, furnishings and site data when their measurements change. All current dimensions are estimates.
3. Add real photos to the evidence registry with new stable IDs; associate `photoIds` with the appropriate rooms/openings/features. Preserve the original bytes. Generated images are not geometric evidence.
4. Record the evidence and `confidence` with every correction. Distinguish owner-confirmed connections, photo-observed features and estimated placement. `notes` explain the remaining uncertainty. Comments in `house-model.js` describe this contract.
5. Rebuild with the private checkpoint's packaging scripts. Replace the page and matching encrypted gallery together; nonces/salt change on every packaging run. Never upload plaintext JSON, photos or GLB exports.
6. Check exterior, both floor cutaways, room viewpoints, stair clearance, photo references, locking and mobile layouts under `/rcg/`. GitHub Actions builds Jekyll and publishes Pages from `main`.

To change renderer behavior, use the private source project's pinned `package.json` and lockfile, run `npm ci` and `npm run build`, then package/encrypt again. The private checkpoint includes the build scripts, plan, floor-plan images, evidence mappings, rebuilding instructions and a GLB export. The site also has a 2D fallback if WebGL cannot start.

Navigation uses orbit controls and guided room viewpoints, rather than unrestricted walking. This avoids promising wall/floor collisions in an approximate reconstruction.
