# man-and-van-harrow-static (Phase 2 build)

Static rebuild of man-and-van-harrow.co.uk from approved Phase 1 audit.

- 55 URLs preserved verbatim (no slug / title / H1 changes).
- Content extracted from live pages, WP/Elementor debris stripped.
- CTA destinations from `audit/comparison.csv`.
- Canonical = trailing-slash URL.
- Bare (no trailing slash) variants 301 → trailing slash via vercel.json.
- No DNS cutover yet.

Generated 2026-06-03. 55 pages.
