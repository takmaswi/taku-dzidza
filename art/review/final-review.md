# Visuals 2 final asset review

Reviewed 2026-11-05, Africa/Harare. Read-only audit of delivery outputs and helpers, followed by this report only. No git mutation or app test was performed by the reviewer.

## Result

No critical or high issue found. All requested asset categories are present. One P2 documentation classification issue was reported to the root agent for correction before the final inventory regeneration.

### P2 - Decor edge review sheets have the wrong inventory generator classification

`art/review/document_visuals.py` excludes the obsolete names `alpha-edges-200pct-1` and `alpha-edges-200pct-2` when identifying generated decor rasters. The actual files are `art/decor/edges-200pct-light.png` and `art/decor/edges-200pct-dark.png`. Consequently their entries in `art/review/file-inventory.json` and the complete changed-file table in CODEX_NOTES currently describe imagegen assets with generated alpha, while they are opaque Pillow review compositions. The detailed Part B/C record already describes these sheets correctly.

Correct the exclusion list to the actual filenames and regenerate the inventory/NOTES table. This is a provenance-label correction; no image pixels need changing. Root agent was notified. No other required correction identified in this review snapshot.

## Fresh checks performed

- Re-executed all assertions in `art/review/verify_visuals.py` with only its final verification.json write removed in memory. All assertions passed. No verification file was modified by the audit.
- Verified the then-current 223 inventory records: all listed files exist; every recorded hash matches; no changed or untracked delivery art file is omitted. Python caches were excluded as documented. The inventory must be regenerated after this report is added.
- Confirmed 23 expected cutout filenames and 22 unique source hashes; `og-default` is an exact alias of the final landing-hero-wide export. Confirmed all 69 PNG/WebP/shadow files, native export dimensions, WebP byte budgets and identical decoded PNG/WebP alpha. Recorded source alpha maxima are 254 or 255, consistent with the documented unchanged near-opaque model-output exception.
- Independently verified every cutout source SHA-256/native canvas and each of the three scene source hashes/native canvases against the recorded source paths. No source files were written.
- Confirmed scene PNG/WebP pairs at exactly 2560x1600, 1600x900 and 1200x900. All three WebPs are under 250,000 bytes. The landing enlargement is explicitly disclosed; the other scenes are downsampled.
- Confirmed all seven Education kit copies are byte identical to the authoritative kit. All four proposed lockups have path lettering, no text nodes, and the exact approved on-cream rectangle geometry and colours. The board shows all four approved marks on each required surface at all three requested sizes and labels the proposed lockups.
- Confirmed all seven decor PNG/WebP pairs, source-file hashes, genuine alpha, byte budgets and exact WebP alpha equality to the correctly resized PNG alpha. Seven SVG line assets use inherited currentColor with no fill or live text.
- Both retained font binaries identify as Inter, Version 4.001;git-66647c0bb. Proposed suffix construction uses weight 600 and 0.15em tracking; the small byline uses Inter 400. No other typeface was identified in new assets/helpers.
- Confirmed both dark texture dimensions and byte limits, plus unchanged light desktop, light phone and paper texture bytes against origin/codex/textures. The warm dark generator uses the original wave field and the requested charcoal, Education deep and ink inputs.
- Checked current tracked differences and protected paths: all tracked differences are under art; src, convex and public have empty diffs. Existing untracked audit files under docs remain outside this delivery. Reviewed helper output constants: writes target art subdirectories; generated-image and other font paths are read-only inputs in these helpers.
- Scanned changed/new art text, manifests and helpers for common API-key prefixes, GitHub tokens, AWS access-key identifiers and private-key blocks. No matching credential material found. Source filesystem paths are provenance, not credentials.

## Visual review

Viewed the final scene, cutout, brand, decor and texture boards. Also viewed the final landing-hero-wide and dashboard-hero-university 200 percent semantic hair/hand review sheets on cream and charcoal.

- Cutout overview preserves the original range of people, group configurations and study props. Both hands-only source photographs remain hands and props, as disclosed. No broad retained backdrop or obvious cutout halo was identified in these sampled final boards/sheets. The independent full-set semantic review remains documented in people-qa.md.
- All three scenes place realistic seated subjects on warm honey wave surfaces with visible contact shadows, without frames, arches or embedded lettering. The generated scenes reinterpret the texture photographically; this is disclosed rather than represented as pixel-exact texture compositing.
- Decor is a coherent warm stationery set and includes every requested object/mark category. Natural photographic shading is disclosed instead of claiming an indexed exact-hex pixel palette. No teal or old logo appeared in the reviewed new boards.
- Brand board shows the correct three-pill Education mark. The on-cream recommendation for cream/honey surfaces and inverse recommendation for charcoal are supported by the displayed samples. Proposed product lockups remain clearly pending approval.
- Revised dark textures retain broad wave forms and show restrained warm accents without the old teal glow.

## Commit and acceptance boundaries

Exclude `art/textures/__pycache__/` and all .pyc files. Regenerate the inventory after correcting the P2 metadata classification and adding this report. Stage only intended art files. Product lockups still require Takunda's approval before app use. This audit does not certify app integration, physical devices, calibrated displays or every individual source pixel.

## Resolution

The root agent corrected the two edge-sheet filename exclusions in document_visuals.py. The regenerated inventory classifies them as Pillow/PyMuPDF review compositions with no background removal. This resolves the P2 metadata finding.
