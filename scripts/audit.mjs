// Phase 1 audit for man-and-van-harrow.co.uk
// Crawls sitemap, extracts content, joins GSC data, writes inventory + comparison + previews.
import { fetch } from "undici";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import fs from "node:fs";
import path from "node:path";

const SITEMAP = "https://man-and-van-harrow.co.uk/page-sitemap.xml";
const OUT = path.resolve("./out");
const PREVIEW_DIR = path.join(OUT, "preview");
fs.mkdirSync(PREVIEW_DIR, { recursive: true });

const UA = "Mozilla/5.0 (compatible; MAZE-Audit/1.0; +https://mazeremovals.co.uk)";

// ---------- GSC join ----------
function parseGscPages(file) {
  const rows = fs.readFileSync(file, "utf8").trim().split(/\r?\n/).slice(1);
  const map = new Map();
  for (const line of rows) {
    const [url, clicks, impressions, ctr, position] = line.split(",");
    map.set(url.replace(/\/$/, "").toLowerCase(), {
      clicks: +clicks, impressions: +impressions, ctr, position: +position,
    });
  }
  return map;
}
const gsc6m = parseGscPages("/tmp/harrow-audit/gsc/set1/Pages.csv");
const gsc3m = parseGscPages("/tmp/harrow-audit/gsc/set2/Pages.csv");

function gscFor(url) {
  const key = url.replace(/\/$/, "").toLowerCase();
  return { sixM: gsc6m.get(key) || null, threeM: gsc3m.get(key) || null };
}

// ---------- crawl ----------
async function getSitemapUrls() {
  const xml = await (await fetch(SITEMAP, { headers: { "user-agent": UA } })).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

const DEBRIS_PATTERNS = [
  { name: "empty_p", re: /<p>\s*(&nbsp;)?\s*<\/p>/gi },
  { name: "shortcode", re: /\[\/?[a-z_][a-z0-9_\-]*[^\]]*\]/gi },
  { name: "wp_block_comment", re: /<!--\s*\/?wp:[^>]*-->/gi },
  { name: "elementor_classes", re: /elementor-[a-z0-9\-]+/gi },
  { name: "consecutive_brs", re: /(<br\s*\/?>\s*){3,}/gi },
];

function detectDebris(html) {
  const hits = {};
  for (const { name, re } of DEBRIS_PATTERNS) {
    const m = html.match(re);
    if (m && m.length) hits[name] = m.length;
  }
  return hits;
}

const LANDMARK_PATTERNS = [
  "Pinner","Stanmore","Wembley","Edgware","Kenton","Queensbury","Rayners Lane",
  "South Harrow","North Harrow","West Harrow","Wealdstone","Greenford","Ruislip",
  "Harrow-on-the-Hill","Harrow on the Hill","Harrow Weald","Pinner Memorial",
  "Northwick Park","Headstone Manor","RAF Northolt","Kenton Road","Northolt",
  "Hatch End","Eastcote","A312","A404","A4090","Metropolitan line","Piccadilly line",
];
function findLandmarks(text) {
  const found = new Set();
  for (const lm of LANDMARK_PATTERNS) {
    if (new RegExp(`\\b${lm.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(text)) found.add(lm);
  }
  return [...found];
}

function extractMain($) {
  // Try common WP main content selectors
  const candidates = ["main", "article", "#main", "#content", ".entry-content", ".site-main", ".page-content"];
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 100) return el;
  }
  return $("body");
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function cleanText(html) {
  let h = html;
  for (const { re } of DEBRIS_PATTERNS) h = h.replace(re, " ");
  const $$ = cheerio.load(`<div>${h}</div>`);
  $$("script,style,noscript").remove();
  return $$.root().text().replace(/\s+/g, " ").trim();
}

function slugFromUrl(url) {
  const p = new URL(url).pathname.replace(/\/$/, "");
  return p === "" ? "home" : p.replace(/^\//, "").replace(/\//g, "_");
}

async function auditOne(url) {
  let html = "", status = 0;
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
    status = res.status;
    html = await res.text();
  } catch (e) {
    return { url, error: e.message, http_status: 0 };
  }
  const $ = cheerio.load(html);
  const title = ($("title").first().text() || "").trim();
  const meta_description = ($('meta[name="description"]').attr("content") || "").trim();
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  const h1 = $("h1").first().text().trim();
  const h2_list = $("h2").map((_, e) => $(e).text().trim()).get().filter(Boolean);
  const h3_list = $("h3").map((_, e) => $(e).text().trim()).get().filter(Boolean);

  const main = extractMain($);
  const main_html = main.html() || "";
  const main_text_raw = main.text().replace(/\s+/g, " ").trim();
  const main_text_clean = cleanText(main_html);

  const word_count_raw = wordCount(main_text_raw);
  const word_count_clean = wordCount(main_text_clean);
  const debris = detectDebris(main_html);

  const origin = new URL(url).origin;
  const links = $("a[href]").map((_, e) => ({
    href: $(e).attr("href") || "",
    text: $(e).text().trim().slice(0, 80),
  })).get();
  const internal_links = links.filter(l => {
    try { return new URL(l.href, url).origin === origin; } catch { return false; }
  });
  const external_links = links.filter(l => {
    try { return new URL(l.href, url).origin !== origin; } catch { return false; }
  });

  const cta_buttons = links
    .filter(l => /quote|enquir|book|call|contact|free estimate|get a price/i.test(l.text))
    .map(l => ({ text: l.text, href: l.href }));

  const images = $("img").map((_, e) => ({
    src: $(e).attr("src") || "",
    alt: ($(e).attr("alt") || "").trim(),
  })).get();

  const landmarks = findLandmarks(main_text_clean);
  const { sixM, threeM } = gscFor(url);

  return {
    url, slug: slugFromUrl(url), http_status: status,
    title, meta_description, canonical, h1,
    h2_list, h3_list,
    word_count_raw, word_count_clean,
    debris,
    internal_link_count: internal_links.length,
    external_link_count: external_links.length,
    internal_links: internal_links.slice(0, 60),
    external_links: external_links.slice(0, 30),
    cta_buttons,
    images,
    landmarks,
    gsc_6m: sixM, gsc_3m: threeM,
    main_text_clean,
    main_html,
  };
}

// ---------- duplicate detection ----------
function shingles(text, k = 5) {
  const w = text.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  return out;
}
function jaccard(a, b) {
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

// ---------- recommendation ----------
const RANKING_HARD_PRESERVE = new Set([
  "/", "/man-and-van-harrow/", "/house-removals-harrow/", "/moving-costs-harrow/",
  "/student-moves-harrow/", "/contact/",
]);

// Only these count as visible-content debris that would justify a polish:
const VISIBLE_DEBRIS = ["shortcode","wp_block_comment","empty_p","consecutive_brs"];

function classify(row, dupCluster) {
  const path = new URL(row.url).pathname;
  const impressions6m = row.gsc_6m?.impressions || 0;
  const impressions3m = row.gsc_3m?.impressions || 0;
  const ranking = impressions6m >= 10 || impressions3m >= 10 || RANKING_HARD_PRESERVE.has(path);
  const visibleDebris = Object.keys(row.debris || {}).filter(k => VISIBLE_DEBRIS.includes(k));

  let verdict, reason;
  if (row.http_status !== 200) {
    verdict = "rewrite"; reason = `HTTP ${row.http_status}`;
  } else if (row.word_count_clean < 100) {
    verdict = "rewrite"; reason = `Thin: ${row.word_count_clean} clean words`;
  } else if (ranking) {
    // Hard rule: never propose rewrite for a ranking page.
    if (visibleDebris.length) {
      verdict = "light_polish";
      reason = `Ranking (6m imp=${impressions6m}, 3m imp=${impressions3m}); strip ${visibleDebris.join("+")} without touching copy`;
    } else {
      verdict = "preserve";
      reason = `Ranking (6m imp=${impressions6m}, 3m imp=${impressions3m}) — preserve verbatim`;
    }
  } else if (dupCluster && dupCluster.size > 1) {
    verdict = "light_polish";
    reason = `Spun sibling of ${dupCluster.size} pages — keep skeleton, add unique local detail (landmarks: ${row.landmarks.slice(0,3).join(", ")||"none found"})`;
  } else if (visibleDebris.length) {
    verdict = "light_polish";
    reason = `Visible debris to strip: ${visibleDebris.join(", ")}`;
  } else {
    verdict = "preserve";
    reason = "Stable content, no visible debris";
  }
  return { verdict, reason, ranking, impressions6m, impressions3m, visible_debris: visibleDebris };
}

// ---------- main ----------
const urls = await getSitemapUrls();
console.error(`Sitemap: ${urls.length} URLs`);
const limit = pLimit(4);
const rows = await Promise.all(urls.map(u => limit(() => auditOne(u))));
console.error(`Fetched ${rows.filter(r => r.http_status === 200).length}/${rows.length} OK`);

// duplicates: cluster by Jaccard >= 0.6 over 5-shingles
const sigs = rows.map(r => ({ url: r.url, sig: shingles(r.main_text_clean || "", 5) }));
const clusters = []; // array of Set of urls
for (const a of sigs) {
  let placed = false;
  for (const cluster of clusters) {
    const repUrl = [...cluster][0];
    const rep = sigs.find(s => s.url === repUrl);
    if (jaccard(a.sig, rep.sig) >= 0.6) { cluster.add(a.url); placed = true; break; }
  }
  if (!placed) clusters.push(new Set([a.url]));
}
const urlCluster = new Map();
for (const c of clusters) if (c.size > 1) for (const u of c) urlCluster.set(u, c);

// inventory + comparison
const inventory = rows.map(r => {
  const cluster = urlCluster.get(r.url);
  const cls = classify(r, cluster);
  return { ...r, ...cls, duplicate_cluster_size: cluster?.size || 1 };
});

// CSV writers
function csvEscape(v) {
  if (v == null) return "";
  const s = String(v).replace(/\r?\n/g, " ");
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const invCols = [
  "url","slug","http_status","title","meta_description","canonical","h1",
  "h2_count","h3_count","word_count_raw","word_count_clean",
  "debris_summary","internal_link_count","external_link_count",
  "cta_count","cta_destinations","image_count","landmarks",
  "gsc_6m_clicks","gsc_6m_impressions","gsc_6m_position",
  "gsc_3m_clicks","gsc_3m_impressions","gsc_3m_position",
  "currently_ranking","duplicate_cluster_size","recommendation","recommendation_reason",
];
const invCsv = [invCols.join(",")].concat(inventory.map(r => [
  r.url, r.slug, r.http_status, r.title, r.meta_description, r.canonical, r.h1,
  r.h2_list?.length || 0, r.h3_list?.length || 0,
  r.word_count_raw, r.word_count_clean,
  Object.entries(r.debris || {}).map(([k,v])=>`${k}:${v}`).join("; "),
  r.internal_link_count, r.external_link_count,
  r.cta_buttons?.length || 0,
  (r.cta_buttons||[]).map(c=>c.href).join(" | "),
  r.images?.length || 0,
  (r.landmarks||[]).join(" | "),
  r.gsc_6m?.clicks ?? "", r.gsc_6m?.impressions ?? "", r.gsc_6m?.position ?? "",
  r.gsc_3m?.clicks ?? "", r.gsc_3m?.impressions ?? "", r.gsc_3m?.position ?? "",
  r.ranking ? "yes" : "no",
  r.duplicate_cluster_size,
  r.verdict, r.reason,
].map(csvEscape).join(",")));
fs.writeFileSync(path.join(OUT, "harrow-inventory.csv"), invCsv.join("\n"));

// JSON (strip heavy fields to keep file usable)
const invJson = inventory.map(({ main_html, internal_links, external_links, ...rest }) => ({
  ...rest,
  internal_links_sample: internal_links?.slice(0, 10),
  external_links_sample: external_links?.slice(0, 10),
}));
fs.writeFileSync(path.join(OUT, "harrow-inventory.json"), JSON.stringify(invJson, null, 2));

// service inference for CTA
function serviceFor(url) {
  const p = url.toLowerCase();
  if (p.includes("house-removals") || p.includes("removals")) return "removals";
  if (p.includes("student-moves")) return "man_and_van"; // MAZE has no student value
  if (p.includes("man-and-van")) return "man_and_van";
  return ""; // generic
}
function areaFor(url) {
  const p = new URL(url).pathname.replace(/\/$/, "").split("/").pop() || "";
  // Try to capture trailing area, e.g. man-and-van-harrow-pinner -> pinner
  const m = p.match(/^(?:man-and-van-harrow|house-removals-harrow|student-moves-harrow|small-removals-harrow)-?(.*)$/);
  if (m && m[1]) return m[1];
  if (p === "" || p === "contact" || p === "about" || p === "how-it-works" || p === "moving-costs-harrow") return "harrow";
  return "harrow";
}
function ctaFor(url) {
  const svc = serviceFor(url);
  const area = areaFor(url);
  const qs = new URLSearchParams({
    from: "harrow",
    ...(svc ? { service: svc } : {}),
    ...(area ? { area } : {}),
    utm_source: "harrow_feeder",
    utm_medium: "local_site",
    utm_campaign: "harrow_static_rebuild",
  });
  return `https://mazeremovals.co.uk/?${qs.toString()}`;
}

// comparison.csv (sign-off table)
const cmpCols = [
  "old_url","new_url","slug_changed","title_changed","h1_changed",
  "body_verdict","word_count_old_raw","word_count_old_clean","word_count_new_target_min",
  "debris_to_remove","cta_destination","internal_links_added","recommendation_reason",
];
const cmpCsv = [cmpCols.join(",")].concat(inventory.map(r => [
  r.url, r.url, "no", "no", "no",
  r.verdict, r.word_count_raw, r.word_count_clean, r.word_count_clean, // never reduce
  Object.entries(r.debris || {}).map(([k,v])=>`${k}:${v}`).join("; "),
  ctaFor(r.url),
  // proposed internal links: parent service hub + 3 nearest siblings (phase 2 will fill exact slugs)
  "parent_service_hub + 3_nearest_area_siblings",
  r.reason,
].map(csvEscape).join(",")));
fs.writeFileSync(path.join(OUT, "comparison.csv"), cmpCsv.join("\n"));

// debris report
const debrisRows = inventory.filter(r => Object.keys(r.debris || {}).length);
fs.writeFileSync(path.join(OUT, "debris-report.md"),
  `# WordPress debris report\n\n${debrisRows.length} pages contain removable debris.\n\n` +
  debrisRows.map(r => `## ${r.url}\n` +
    Object.entries(r.debris).map(([k,v])=>`- \`${k}\`: ${v} occurrences`).join("\n")).join("\n\n"));

// duplicates report
const dupClusters = clusters.filter(c => c.size > 1);
fs.writeFileSync(path.join(OUT, "duplicates-report.md"),
  `# Duplicate / spun page clusters (Jaccard ≥ 0.6 on 5-shingles)\n\n` +
  `${dupClusters.length} clusters covering ${dupClusters.reduce((s,c)=>s+c.size,0)} pages.\n\n` +
  dupClusters.map((c,i)=>`## Cluster ${i+1} (${c.size} pages)\n` + [...c].map(u=>`- ${u}`).join("\n")).join("\n\n"));

// previews (old vs proposed) — phase 1: shows old + flagged debris + recommendation
for (const r of inventory) {
  const safeSlug = r.slug.replace(/[^a-z0-9_\-]/gi,"_") || "home";
  const debrisHl = Object.keys(r.debris||{}).length
    ? `<ul>${Object.entries(r.debris).map(([k,v])=>`<li><code>${k}</code> &times; ${v}</li>`).join("")}</ul>`
    : "<p><em>None detected.</em></p>";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Audit: ${r.url}</title>
<style>body{font:14px/1.5 system-ui;margin:0;padding:0;color:#222}
header{padding:16px 24px;background:#0F172A;color:#fff}
header h1{margin:0;font-size:16px}
header .meta{font-size:12px;opacity:.8;margin-top:4px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:0}
.col{padding:16px 24px;border-right:1px solid #e5e7eb;min-height:60vh}
.col:last-child{border-right:none;background:#fafafa}
.col h2{font-size:13px;text-transform:uppercase;color:#666;margin:0 0 12px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.badge.preserve{background:#dcfce7;color:#166534}
.badge.light_polish{background:#fef9c3;color:#854d0e}
.badge.rewrite{background:#fee2e2;color:#991b1b}
iframe{width:100%;height:70vh;border:1px solid #e5e7eb;background:#fff}
dl{display:grid;grid-template-columns:140px 1fr;gap:4px 12px;margin:0 0 12px;font-size:13px}
dt{color:#666}dd{margin:0}
</style></head><body>
<header>
<h1>${r.url}</h1>
<div class="meta">slug: <code>${r.slug}</code> · HTTP ${r.http_status} · clean words ${r.word_count_clean} · <span class="badge ${r.verdict}">${r.verdict.toUpperCase()}</span> · ${r.reason}</div>
</header>
<div class="cols">
  <div class="col">
    <h2>Live page (current)</h2>
    <dl>
      <dt>Title</dt><dd>${r.title}</dd>
      <dt>Meta desc</dt><dd>${r.meta_description}</dd>
      <dt>H1</dt><dd>${r.h1}</dd>
      <dt>H2 count</dt><dd>${r.h2_list.length}</dd>
      <dt>Words (raw)</dt><dd>${r.word_count_raw}</dd>
      <dt>GSC 6m</dt><dd>${r.gsc_6m ? `${r.gsc_6m.impressions} imp · pos ${r.gsc_6m.position}` : "—"}</dd>
      <dt>Landmarks</dt><dd>${r.landmarks.join(", ") || "—"}</dd>
    </dl>
    <iframe src="${r.url}" loading="lazy"></iframe>
  </div>
  <div class="col">
    <h2>Phase-2 contract (proposed)</h2>
    <dl>
      <dt>New URL</dt><dd>${r.url} (unchanged)</dd>
      <dt>Title</dt><dd>preserve unless flagged</dd>
      <dt>H1</dt><dd>preserve unless flagged</dd>
      <dt>Word count floor</dt><dd>≥ ${r.word_count_clean} clean words</dd>
      <dt>Debris to strip</dt><dd>${debrisHl}</dd>
      <dt>CTA</dt><dd><code style="font-size:11px">${ctaFor(r.url)}</code></dd>
      <dt>Internal links</dt><dd>+ parent service hub + 3 nearest area siblings + breadcrumb</dd>
      <dt>JSON-LD</dt><dd>BreadcrumbList + Service (area pages) / HowTo (how-it-works) / FAQPage (if FAQs present)</dd>
    </dl>
  </div>
</div></body></html>`;
  fs.writeFileSync(path.join(PREVIEW_DIR, `${safeSlug}.html`), html);
}

// preview index
const indexHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Harrow audit previews</title>
<style>body{font:14px/1.5 system-ui;max-width:1100px;margin:24px auto;padding:0 16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:6px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
th{background:#f8fafc;position:sticky;top:0}
.b{display:inline-block;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600}
.preserve{background:#dcfce7;color:#166534}.light_polish{background:#fef9c3;color:#854d0e}.rewrite{background:#fee2e2;color:#991b1b}
a{color:#0f766e}
</style></head><body>
<h1>man-and-van-harrow.co.uk — Phase 1 audit (${inventory.length} URLs)</h1>
<p>Counts: ${["preserve","light_polish","rewrite"].map(v=>`<strong>${v}</strong>: ${inventory.filter(r=>r.verdict===v).length}`).join(" · ")} · ranking: ${inventory.filter(r=>r.ranking).length} · with debris: ${inventory.filter(r=>Object.keys(r.debris||{}).length).length}</p>
<table><thead><tr><th>URL</th><th>Verdict</th><th>Words (clean)</th><th>GSC 6m imp</th><th>Pos</th><th>Reason</th><th>Preview</th></tr></thead><tbody>
${inventory.map(r=>`<tr>
<td><a href="${r.url}" target="_blank">${new URL(r.url).pathname}</a></td>
<td><span class="b ${r.verdict}">${r.verdict}</span></td>
<td>${r.word_count_clean}</td>
<td>${r.gsc_6m?.impressions ?? "—"}</td>
<td>${r.gsc_6m?.position ?? "—"}</td>
<td>${r.reason}</td>
<td><a href="preview/${r.slug.replace(/[^a-z0-9_\-]/gi,"_")||"home"}.html">open</a></td>
</tr>`).join("")}
</tbody></table></body></html>`;
fs.writeFileSync(path.join(OUT, "preview-index.html"), indexHtml);

// summary
const summary = {
  total_urls: inventory.length,
  ok: inventory.filter(r=>r.http_status===200).length,
  preserve: inventory.filter(r=>r.verdict==="preserve").length,
  light_polish: inventory.filter(r=>r.verdict==="light_polish").length,
  rewrite: inventory.filter(r=>r.verdict==="rewrite").length,
  ranking_pages: inventory.filter(r=>r.ranking).length,
  with_debris: inventory.filter(r=>Object.keys(r.debris||{}).length).length,
  duplicate_clusters: dupClusters.length,
};
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
console.error(JSON.stringify(summary, null, 2));
