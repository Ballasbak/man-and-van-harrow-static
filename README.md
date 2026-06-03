# man-and-van-harrow-static

Static SEO feeder site for `man-and-van-harrow.co.uk`, preserving existing URLs
and linking quote CTAs to MAZE.

## Phase 1 — audit only (this commit)

No rebuild yet. This commit contains the full audit of the existing live site
so content/recommendation decisions can be reviewed before any rebuild starts.

### Deliverables (`audit/`)
- `harrow-inventory.csv` / `.json` — one row per live URL, full extraction.
- `comparison.csv` — sign-off table: old URL, new URL, what changes, CTA dest, word-count floor.
- `debris-report.md` — visible WordPress debris flagged per page.
- `duplicates-report.md` — spun-sibling clusters (Jaccard ≥ 0.6 on 5-shingles).
- `preview-index.html` + `preview/{slug}.html` — side-by-side per-page audit views.
- `summary.json` — counts.
- `gsc-{6m,3m}-{pages,queries}.csv` — raw GSC exports used to populate `currently_ranking`.

### Confirmed MAZE quote-flow contract (locked for Phase 2 CTAs)
- Referral key: `from=harrow`
- Service values (exact, snake_case): `man_and_van` | `removals`
  (student-moves pages map to `man_and_van` — MAZE has no separate student service)
- Area: lowercased hyphenated slug, e.g. `pinner`, `harrow-on-the-hill`
- Full CTA: `https://mazeremovals.co.uk/?from=harrow&service={man_and_van|removals}&area={slug}&utm_source=harrow_feeder&utm_medium=local_site&utm_campaign=harrow_static_rebuild`

### Recommendation rules used
- Ranking pages (GSC ≥ 10 impressions in 6m or 3m, or hard list) → **preserve**, or **light_polish** only if visible debris (shortcodes / wp comments / empty paragraphs / runs of `<br>`) is present. Never rewrite.
- Spun-sibling cluster (≥ 60% 5-shingle overlap) → **light_polish** with mandate to add unique local detail.
- Visible debris only, not a ranking page → **light_polish**.
- < 100 clean words or non-200 → **rewrite**.
- Elementor class noise alone is NOT flagged as debris (markup, not content).

### Hard constraints carried into Phase 2
- URL slugs are immutable.
- Title / H1 changes only if empty, duplicated across pages, or factually wrong.
- `word_count_new_clean` ≥ `word_count_old_clean` per page.
- No React / Vite / Next / SPA — plain static HTML, fully readable in view-source.
- Hosting: Vercel via `vercel.json` (no `.htaccess`).
- Out of scope for Phase 1: rebuild, `vercel.json`, `sitemap.xml`, `robots.txt`, DNS, MAZE code changes.

### Re-running the audit
```
npm install
npm run audit
```
Output lands in `out/` — copy into `audit/` if you want to commit it.
