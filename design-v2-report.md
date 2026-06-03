# Harrow Static Feeder — Design v2 (Review)

**Status:** Review build only. No deployment, no DNS, no merge.
**Output:** `dist-v2/` — 55 routes, plus `sitemap.xml`, `robots.txt`, `vercel.json` (copied unchanged from approved Phase 2).
**Source of truth:** approved Phase 2 `dist/` (untouched).

## What changed

Visual / structural pass only. Each Phase 2 page was parsed, all SEO-locked fields were preserved verbatim, and the body was re-emitted into a new comparison-landing template.

### Locked (verified per-route, 55/55 pass):
- URL path
- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `<h1>`
- Primary CTA `href` (incl. `?from=`, `service=`, `area=`, `utm_*`)
- All Phase 2 `<p>` paragraphs still present in v2 body text (substring-checked)
- All `<script type="application/ld+json">` blocks copied through

### Restructured:
- New sticky light-theme header with brand mark `Man & Van Harrow` + `Compare via MAZE` badge.
- Hero split into two columns: H1 + lede + primary CTA + trust strip, plus an above-fold MAZE quote card on the right.
- New "How it works" 3-card band (alt background).
- New "Services compared" 3-card band, service order tilts toward the page's own service.
- New "Local coverage" chip row: Harrow, Pinner, Ruislip, Kenton, Wealdstone, North Harrow, South Harrow, Stanmore, Edgware, Eastcote.
- Long-form Phase 2 content moved into a `prose` column with a sticky CTA sidecard.
- New dark navy secondary CTA band.
- New dark navy footer with explicit positioning: "MAZE is not a removals company — independent local movers respond with their own quotes."
- "MAZE Removals" → "MAZE" everywhere (0 leaks remain).

### Info pages (`how-it-works`, `privacy-policy`, `terms-conditions`, `contact`, `partners`, `areas-covered`, `moving-costs-harrow`):
- Same header/footer/visual system, no comparison cards, no chips.
- Single-column readable prose, single CTA band at the bottom.

## Visual system

| Token | Value | Use |
|---|---|---|
| `--bg` | `#ffffff` / `#f6f9fc` | base / alt sections |
| `--text` | `#0f1b2d` / `#3b4b66` | primary / secondary |
| `--navy` | `#0f1b3d` | brand text, footer/CTA band |
| `--teal` | `#0d6b7a` | links, badges, ticks |
| `--orange` | `#e8631a` | primary CTA only — restrained |
| `--border` | `#e6ecf2` | cards, chips |
| Font | `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto` | system stack — no webfont blocking |
| Radius | 10–18px | cards / chips / CTA band |

Pure static HTML/CSS. No JS, no Tailwind, no build framework. CSS is inlined per page (single shared block, ~5 KB) so view-source remains complete and crawlable.

## Verification (script-driven)

```
Routes checked:      55
Title unchanged:     55/55
Description:         55/55
Canonical:           55/55
H1 unchanged:        55/55
CTA href unchanged:  55/55
Missing paragraphs:  0
"MAZE Removals":     0 leaks
```

Script: `/tmp/verify-v2.mjs` (parses both `dist/` and `dist-v2/` with cheerio).

## QA screenshots

Rendered at 1280px in headless Chromium against a local HTTP server:

- `qa/home.png` — `/`
- `qa/house-removals-edgware.png` — `/house-removals-edgware/`
- `qa/man-and-van-harrow-stanmore.png` — `/man-and-van-harrow-stanmore/`
- `qa/student-moves-harrow.png` — `/student-moves-harrow/`
- `qa/how-it-works.png` — `/how-it-works/`
- `qa/areas-covered.png` — `/areas-covered/`

Combined overview: `qa/montage.png`.

Note on rendering: in the headless-Linux QA capture, heading fonts fall back to a monospace because the BlinkMacSystemFont/Segoe UI/Inter fonts aren't installed in the QA sandbox. On real browsers (macOS Safari/Chrome, Windows Edge/Chrome, iOS/Android) the system stack resolves to SF Pro / Segoe UI / Roboto as intended.

## Out of scope (explicitly not done)

- No URL changes.
- No H1, title, meta description, canonical, JSON-LD changes.
- No CTA parameter changes.
- No new copy beyond hero subline / card labels / footer positioning line — all body paragraphs from Phase 2 retained.
- No deployment, no Vercel cutover, no DNS change, no MAZE app changes.

## Next step

Review `dist-v2/` (or the zipped `harrow-static-phase2-designv2.zip`) and confirm whether to:
1. Approve as the new feeder build (then we ship into the `Ballasbak/man-and-van-harrow-static` repo as a v2 branch), or
2. Iterate further (specific feedback per section).
