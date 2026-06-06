import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const wave1 = new Map([
  ["man-and-van-harrow-edgware", ["man-and-van", "Edgware", "man_and_van"]],
  ["man-and-van-harrow-greenford", ["man-and-van", "Greenford", "man_and_van"]],
  ["man-and-van-harrow-kenton", ["man-and-van", "Kenton", "man_and_van"]],
  ["man-and-van-harrow-north-harrow", ["man-and-van", "North Harrow", "man_and_van"]],
  ["man-and-van-harrow-on-the-hill", ["man-and-van", "Harrow on the Hill", "man_and_van"]],
  ["man-and-van-harrow-pinner", ["man-and-van", "Pinner", "man_and_van"]],
  ["man-and-van-harrow-queensbury", ["man-and-van", "Queensbury", "man_and_van"]],
  ["man-and-van-harrow-rayners-lane", ["man-and-van", "Rayners Lane", "man_and_van"]],
  ["man-and-van-harrow-ruislip", ["man-and-van", "Ruislip", "man_and_van"]],
  ["man-and-van-harrow-south-harrow", ["man-and-van", "South Harrow", "man_and_van"]],
  ["man-and-van-harrow-stanmore", ["man-and-van", "Stanmore", "man_and_van"]],
  ["man-and-van-harrow-wealdstone", ["man-and-van", "Wealdstone", "man_and_van"]],
  ["man-and-van-harrow-wembley", ["man-and-van", "Wembley", "man_and_van"]],
  ["man-and-van-harrow-west-harrow", ["man-and-van", "West Harrow", "man_and_van"]],
  ["house-removals-edgware", ["house-removals", "Edgware", "removals"]],
  ["house-removals-pinner", ["house-removals", "Pinner", "removals"]],
  ["house-removals-stanmore", ["house-removals", "Stanmore", "removals"]],
  ["house-removals-ruislip", ["house-removals", "Ruislip", "removals"]],
  ["house-removals-wembley", ["house-removals", "Wembley", "removals"]],
  ["house-removals-kenton", ["house-removals", "Kenton", "removals"]],
  ["house-removals-north-harrow", ["house-removals", "North Harrow", "removals"]],
  ["house-removals-south-harrow", ["house-removals", "South Harrow", "removals"]],
  ["house-removals-west-harrow", ["house-removals", "West Harrow", "removals"]],
  ["house-removals-wealdstone", ["house-removals", "Wealdstone", "removals"]],
  ["house-removals-rayners-lane", ["house-removals", "Rayners Lane", "removals"]],
  ["student-moves-kenton", ["student-moves", "Kenton", "man_and_van"]],
  ["student-moves-wealdstone", ["student-moves", "Wealdstone", "man_and_van"]],
  ["student-moves-wembley", ["student-moves", "Wembley", "man_and_van"]],
  ["student-moves-north-harrow", ["student-moves", "North Harrow", "man_and_van"]],
]);

const serviceInfo = {
  "man-and-van": { phrase: "man and van", hub: "/man-and-van-harrow/", schema: "Man and Van" },
  "house-removals": { phrase: "house removals", hub: "/house-removals-harrow/", schema: "House Removals" },
  "student-moves": { phrase: "student moves", hub: "/student-moves-harrow/", schema: "Student Moves" },
};

function normaliseSlug(value) {
  return value.replaceAll("\\", "/").replace(/^\/|\/$/g, "").replace(/\/index\.html$/, "");
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&middot;", " ")
    .replaceAll("&mdash;", "—")
    .replaceAll("&copy;", " ")
    .replace(/&#\d+;/g, " ");
}

function stripHtml(value) {
  return decodeHtml(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html, pattern) {
  return decodeHtml(html.match(pattern)?.[1]?.trim() || "");
}

function countMatches(text, value) {
  return text.toLowerCase().split(value.toLowerCase()).length - 1;
}

function includesText(text, value) {
  return text.toLowerCase().includes(value.toLowerCase());
}

function run(routeArg) {
  const slug = normaliseSlug(routeArg);
  const config = wave1.get(slug);
  if (!config) throw new Error(`Not a Wave 1 route: ${routeArg}`);

  const [service, area, mazeService] = config;
  const info = serviceInfo[service];
  const file = path.join(root, slug, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const decodedHtml = decodeHtml(html);
  const expectedPath = `/${slug}/`;
  const expectedCanonical = `https://man-and-van-harrow.co.uk${expectedPath}`;
  const areaSlug = area.toLowerCase().replaceAll(" ", "-");
  const expectedCta = `https://mazeremovals.co.uk/?from=harrow&service=${mazeService}&area=${areaSlug}&utm_source=harrow_feeder&utm_medium=local_site&utm_campaign=harrow_static_rebuild`;
  const results = [];
  const check = (name, pass, detail = "") => results.push({ name, pass: Boolean(pass), detail });

  const title = firstMatch(html, /<title>([\s\S]*?)<\/title>/i);
  const meta = firstMatch(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1 = stripHtml(h1Matches[0]?.[1] || "");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
  const firstWords = stripHtml(main).split(" ").slice(0, 100).join(" ");
  const schemas = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(match => {
    try {
      return JSON.parse(match[1]);
    } catch {
      return { "@type": "INVALID_JSON" };
    }
  });
  const schemaTypes = schemas.map(item => item["@type"]);
  const links = [...decodedHtml.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)].map(match => match[1]);
  const externalCtas = links.filter(href => href.startsWith("https://mazeremovals.co.uk/"));
  const siblingPrefix = service === "man-and-van" ? "/man-and-van-harrow-" : `/${service}-`;
  const sameServiceSiblings = [...new Set(links.filter(href =>
    href.startsWith(siblingPrefix) && href !== expectedPath && href !== info.hub
  ))];
  const forbiddenSchema = ["LocalBusiness", "MovingCompany", "Product", "Offer", "Review", "AggregateRating"];
  const forbiddenWords = ["MAZE Removals", "MAZE engine", "MAZE quote system", "MAZE booking system"];
  const allScripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => match[1]);
  const nonJsonScripts = allScripts.filter(attributes => !/type="application\/ld\+json"/i.test(attributes));

  check("canonical", firstMatch(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i) === expectedCanonical, expectedCanonical);
  check("title length", title.length <= 60, `${title.length}/60`);
  check("title service and area", includesText(title, info.phrase) && includesText(title, area), title);
  check("meta length", meta.length <= 160, `${meta.length}/160`);
  check("meta area in first 120", includesText(meta.slice(0, 120), area), meta);
  check("one H1", h1Matches.length === 1, `found ${h1Matches.length}`);
  check("H1 service and area", includesText(h1, info.phrase) && includesText(h1, area), h1);
  check("shared CSS only", /<link\s+rel="stylesheet"\s+href="\/assets\/site\.css">/i.test(html) && !/<style\b/i.test(html));
  check("engine-first hero", /<section\s+class="hero"/i.test(html) && /class="hero-sub"/i.test(html) && /class="btn btn-primary"/i.test(html) && /class="trust-strip"/i.test(html));
  check("full Tier 1 header nav", links.includes("/areas-covered/") && links.includes("/how-it-works/") && links.includes("/moving-costs-harrow/") && /<span class="badge">Harrow<\/span>/i.test(html));
  check("quote engine form", /<form\s+class="engine"\s+action="https:\/\/mazeremovals\.co\.uk\/"\s+method="get">/i.test(html));
  check("quote engine defaults", new RegExp(`name="from_postcode"\\s+value="${area}"`, "i").test(html) && /name="to_postcode"\s+placeholder="Postcode or area"/i.test(html) && new RegExp(`name="service"[\\s\\S]*?<option\\s+value="${mazeService}"\\s+selected>`, "i").test(html));
  check("quote engine hidden params", [
    ["from", "harrow"],
    ["area", areaSlug],
    ["utm_source", "harrow_feeder"],
    ["utm_medium", "local_site"],
    ["utm_campaign", "harrow_static_rebuild"],
  ].every(([name, value]) => new RegExp(`<input type="hidden" name="${name}" value="${value}">`, "i").test(html)));
  check("area twice in first 100 words", countMatches(firstWords, area) >= 2, `found ${countMatches(firstWords, area)}`);
  check("service in first 100 words", includesText(firstWords, info.phrase));
  check("local detail block", /id="local-detail"/i.test(html));
  check("hub-up link", links.filter(href => href === info.hub).length >= 1, info.hub);
  check("same-service sibling links", sameServiceSiblings.length >= 2 && sameServiceSiblings.length <= 3, sameServiceSiblings.join(", "));
  check("areas-covered link", links.includes("/areas-covered/"));
  check("cross-service same-area link", links.some(href => href.includes(areaSlug) && !href.includes(service)));
  check("all MAZE CTAs canonical", externalCtas.length >= 5 && externalCtas.every(href => href === expectedCta), `${externalCtas.length} CTAs`);
  check("BreadcrumbList schema", schemaTypes.includes("BreadcrumbList"));
  check("Service schema", schemas.some(item => item["@type"] === "Service" && item.serviceType === info.schema && item.areaServed?.name === `${area}, Harrow, London`));
  check("FAQ schema and visible FAQ", schemaTypes.includes("FAQPage") && (html.match(/<details\s+class="faq"/gi)?.length || 0) >= 3);
  check("MAZE Organization schema", schemas.some(item => item["@type"] === "Organization" && item.name === "MAZE" && item.url === "https://mazeremovals.co.uk"));
  check("no forbidden schema", !schemas.some(item => forbiddenSchema.includes(item["@type"])), schemaTypes.join(", "));
  check("no forbidden wording", !forbiddenWords.some(word => html.includes(word)));
  check("no third-party or gated JS", nonJsonScripts.length === 0, `found ${nonJsonScripts.length} non-JSON scripts`);
  check("no mojibake markers", !/[Ââ]/.test(html));

  for (const result of results) {
    console.log(`${result.pass ? "PASS" : "FAIL"}  ${result.name}${result.detail ? ` - ${result.detail}` : ""}`);
  }
  const failed = results.filter(result => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed for ${expectedPath}`);
  process.exitCode = failed.length ? 1 : 0;
}

run(process.argv[2] || "house-removals-edgware");
