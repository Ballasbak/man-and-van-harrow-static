# Codex Design Polish Review

Branch: `codex-design-polish-test`
Baseline: `origin/lovable-phase2-baseline`

## Current Lovable Build Review

The Phase 2 build was structurally safe for a static SEO feeder site: 55 static `index.html` routes, crawlable `robots.txt`, a 55-URL `sitemap.xml`, canonical tags, and MAZE quote links were present.

The visual layer was the weak point. The original output felt like a narrow text export rather than a competitive local removals comparison site. Header, hero, CTA, trust, content-card, nearby-area, mobile, and footer treatment were all very plain.

## Critical Issues

None found after the design polish pass.

## Recommended Fixes Applied

- Added a stronger local removals visual identity across all production pages.
- Reworked the shared static layout with a richer header, hero, reassurance panel, trust strip, content card, CTA panel, nearby-area cards, and stronger footer.
- Preserved all page H1s, titles, canonical URLs, slugs, sitemap URLs, and MAZE CTA parameters.
- Fixed narrow copy debris only: `poastcode`, spaces before punctuation, `How it Works .`, `&amp;amp;`, `Queenbury`, and incorrect Wembley CTA headings on non-Wembley man-and-van pages.
- Clarified non-Harrow house-removals pages so they do not say "Moving home in Harrow" as if the local area is Harrow only.

## Nice-To-Have Improvements

- Extract the repeated inline CSS into a shared static stylesheet if that is acceptable for Phase 2 maintenance.
- Add real local imagery later, provided it does not slow down pages or create stock-photo blandness.
- Continue light copy cleanup on non-ranking pages after SEO sign-off.
- Consider a dedicated comparison table on the homepage once the MAZE destination flow is fully confirmed.

## Improved Static Design Approach

The proposed direction is a modern, trustworthy local comparison site: warm off-white background, deep navy/teal/orange removals palette, strong hero sections, quote reassurance, clear trust markers, carded content areas, prominent MAZE CTAs, and scannable nearby-area navigation. It remains static HTML, readable in view-source, and Vercel-compatible.

## Validation

- Production routes: 55 `index.html` files.
- Sitemap: 55 unique trailing-slash URLs.
- Canonicals: 55, matching the audit URL list.
- Titles: unchanged from baseline.
- H1s: unchanged from baseline.
- Robots: crawlable.
- MAZE links: `from=harrow`, valid `service` values only, and required UTM parameters preserved.
- Static source: no React, Vite, Next.js, SPA shell, or client-rendered app structure added.
- Local smoke test: `/`, `/man-and-van-harrow-pinner/`, `/moving-costs-harrow/`, `/sitemap.xml`, and `/robots.txt` served 200 locally.

No deployment, DNS, production Vercel connection, merge, or `main` modification was performed.
