#!/usr/bin/env -S deno run -A

import { parse } from "https://esm.sh/node-html-parser@6.1.11";

const LUME_BASE_URL = "http://localhost:8000";
const LIVE_WATERLILIES_URL = "https://www.waterlilies.energy";
const LIVE_HAZELMEAD_URL = "https://www.hazelmead.energy";

interface PageComparison {
  name: string;
  lumePath: string;
  liveUrl: string;
  community: string;
}

const PAGES: PageComparison[] = [
  {
    name: "waterlilies-home",
    lumePath: "/",
    liveUrl: LIVE_WATERLILIES_URL + "/",
    community: "waterlilies",
  },
  {
    name: "hazelmead-home",
    lumePath: "/",
    liveUrl: LIVE_HAZELMEAD_URL + "/",
    community: "hazelmead",
  },
];

async function fetchHtml(url: string, setCookie?: { name: string; value: string }): Promise<string> {
  const headers: Record<string, string> = {};
  
  if (setCookie) {
    headers["Cookie"] = `${setCookie.name}=${setCookie.value}`;
  }
  
  const response = await fetch(url, { headers });
  return await response.text();
}

function getStructure(html: string): { sections: string[]; headings: string[]; links: string[]; images: string[] } {
  const root = parse(html);
  
  // Get major sections
  const sections = root.querySelectorAll("section").map(s => 
    s.getAttribute("class") || "unnamed-section"
  );
  
  // Get headings
  const headings = root.querySelectorAll("h1, h2, h3").map(h => 
    `${h.tagName}: ${h.textContent.trim().substring(0, 50)}`
  );
  
  // Get links
  const links = root.querySelectorAll("a").map(a => 
    a.getAttribute("href") || ""
  ).filter(href => href && !href.startsWith("http"));
  
  // Get images
  const images = root.querySelectorAll("img").map(img => 
    img.getAttribute("src") || ""
  );
  
  return { sections, headings, links, images };
}

async function comparePage(page: PageComparison) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📄 Comparing: ${page.name}`);
  console.log(`${"=".repeat(80)}`);
  
  // Fetch both versions
  console.log(`  Fetching Lume: ${LUME_BASE_URL}${page.lumePath}`);
  const lumeHtml = await fetchHtml(
    LUME_BASE_URL + page.lumePath,
    { name: "community", value: page.community }
  );
  
  console.log(`  Fetching Live: ${page.liveUrl}`);
  const liveHtml = await fetchHtml(page.liveUrl);
  
  // Analyze structure
  const lumeStructure = getStructure(lumeHtml);
  const liveStructure = getStructure(liveHtml);
  
  // Compare sections
  console.log(`\n📦 Sections:`);
  console.log(`  Live: ${liveStructure.sections.join(", ")}`);
  console.log(`  Lume: ${lumeStructure.sections.join(", ")}`);
  
  const missingSections = liveStructure.sections.filter(s => !lumeStructure.sections.includes(s));
  const extraSections = lumeStructure.sections.filter(s => !liveStructure.sections.includes(s));
  
  if (missingSections.length > 0) {
    console.log(`  ❌ Missing in Lume: ${missingSections.join(", ")}`);
  }
  if (extraSections.length > 0) {
    console.log(`  ⚠️  Extra in Lume: ${extraSections.join(", ")}`);
  }
  if (missingSections.length === 0 && extraSections.length === 0) {
    console.log(`  ✅ Sections match!`);
  }
  
  // Compare headings
  console.log(`\n📝 Headings:`);
  console.log(`  Live has ${liveStructure.headings.length} headings`);
  console.log(`  Lume has ${lumeStructure.headings.length} headings`);
  
  if (liveStructure.headings.length !== lumeStructure.headings.length) {
    console.log(`\n  Live headings:`);
    liveStructure.headings.forEach(h => console.log(`    - ${h}`));
    console.log(`\n  Lume headings:`);
    lumeStructure.headings.forEach(h => console.log(`    - ${h}`));
  }
  
  // Compare images
  console.log(`\n🖼️  Images:`);
  console.log(`  Live: ${liveStructure.images.length} images`);
  console.log(`  Lume: ${lumeStructure.images.length} images`);
  
  // Compare links
  console.log(`\n🔗 Internal Links:`);
  console.log(`  Live: ${liveStructure.links.length} links`);
  console.log(`  Lume: ${lumeStructure.links.length} links`);
  
  const missingLinks = liveStructure.links.filter(l => !lumeStructure.links.includes(l));
  if (missingLinks.length > 0) {
    console.log(`  ❌ Missing links in Lume:`);
    missingLinks.forEach(l => console.log(`    - ${l}`));
  }
}

async function main() {
  console.log("🔍 HTML Structure Comparison");
  console.log("Comparing Lume build against live production sites\n");
  
  for (const page of PAGES) {
    await comparePage(page);
  }
  
  console.log(`\n${"=".repeat(80)}`);
  console.log("✅ Comparison complete");
  console.log(`${"=".repeat(80)}\n`);
}

if (import.meta.main) {
  await main();
}
