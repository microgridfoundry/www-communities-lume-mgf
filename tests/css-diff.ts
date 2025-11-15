#!/usr/bin/env -S deno run -A

/**
 * CSS Diff Tool
 * Compares CSS files between live production sites and Lume build
 */

const LUME_BASE_URL = "http://localhost:8000";
const LIVE_WATERLILIES_URL = "https://www.waterlilies.energy";
const LIVE_HAZELMEAD_URL = "https://www.hazelmead.energy";

interface CSSComparison {
  name: string;
  lumeCssUrl: string;
  liveCssUrl: string;
  community: string;
}

const COMPARISONS: CSSComparison[] = [
  {
    name: "waterlilies",
    lumeCssUrl: `${LUME_BASE_URL}/assets/css/style.css`,
    liveCssUrl: `${LIVE_WATERLILIES_URL}/assets/css/style.css`,
    community: "waterlilies",
  },
  {
    name: "hazelmead",
    lumeCssUrl: `${LUME_BASE_URL}/assets/css/style.css`,
    liveCssUrl: `${LIVE_HAZELMEAD_URL}/assets/css/style.css`,
    community: "hazelmead",
  },
];

interface CSSRule {
  selector: string;
  properties: Record<string, string>;
}

function parseCSS(css: string): CSSRule[] {
  const rules: CSSRule[] = [];

  // Remove comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");

  // Match CSS rules (handles media queries too)
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;

  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const propertiesStr = match[2].trim();

    // Skip @import and @font-face
    if (selector.startsWith("@import") || selector.startsWith("@font-face")) {
      continue;
    }

    const properties: Record<string, string> = {};
    const propPairs = propertiesStr.split(";").filter(p => p.trim());

    propPairs.forEach(pair => {
      const colonIndex = pair.indexOf(":");
      if (colonIndex > -1) {
        const prop = pair.substring(0, colonIndex).trim();
        const value = pair.substring(colonIndex + 1).trim();
        properties[prop] = value;
      }
    });

    if (Object.keys(properties).length > 0) {
      rules.push({ selector, properties });
    }
  }

  return rules;
}

function findRule(rules: CSSRule[], selector: string): CSSRule | undefined {
  // Try exact match first
  let rule = rules.find(r => r.selector === selector);
  if (rule) return rule;

  // Try normalized match (remove extra whitespace)
  const normalizedSelector = selector.replace(/\s+/g, " ");
  return rules.find(r => r.selector.replace(/\s+/g, " ") === normalizedSelector);
}

async function compareCSSFiles(comparison: CSSComparison) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🎨 Comparing CSS: ${comparison.name}`);
  console.log(`${"=".repeat(80)}`);

  // Fetch CSS files
  console.log(`  Fetching Lume CSS: ${comparison.lumeCssUrl}`);
  const lumeResponse = await fetch(comparison.lumeCssUrl, {
    headers: { "Cookie": `community=${comparison.community}` }
  });
  const lumeCSS = await lumeResponse.text();

  console.log(`  Fetching Live CSS: ${comparison.liveCssUrl}`);
  const liveResponse = await fetch(comparison.liveCssUrl);
  const liveCSS = await liveResponse.text();

  // Parse CSS
  const lumeRules = parseCSS(lumeCSS);
  const liveRules = parseCSS(liveCSS);

  console.log(`\n📊 Rule counts:`);
  console.log(`  Live: ${liveRules.length} rules`);
  console.log(`  Lume: ${lumeRules.length} rules`);

  // Focus on key selectors
  const keySelectors = [
    ".hero-section",
    ".hero-image",
    ".about-section",
    ".btn",
    ".investor-section",
    ".benefit-section",
  ];

  console.log(`\n🔍 Key selector differences:\n`);

  for (const selector of keySelectors) {
    const liveRule = findRule(liveRules, selector);
    const lumeRule = findRule(lumeRules, selector);

    if (!liveRule && !lumeRule) {
      continue;
    }

    if (!liveRule) {
      console.log(`  ⚠️  ${selector} - Only in Lume`);
      continue;
    }

    if (!lumeRule) {
      console.log(`  ⚠️  ${selector} - Only in Live`);
      continue;
    }

    // Compare properties
    const allProps = new Set([
      ...Object.keys(liveRule.properties),
      ...Object.keys(lumeRule.properties),
    ]);

    const differences: string[] = [];

    for (const prop of allProps) {
      const liveVal = liveRule.properties[prop];
      const lumeVal = lumeRule.properties[prop];

      if (liveVal !== lumeVal) {
        differences.push(`${prop}: ${liveVal || "(missing)"} → ${lumeVal || "(missing)"}`);
      }
    }

    if (differences.length > 0) {
      console.log(`  ❌ ${selector}:`);
      differences.forEach(diff => console.log(`     ${diff}`));
    } else {
      console.log(`  ✅ ${selector} - identical`);
    }
  }

  // Find rules that exist in one version but not the other
  console.log(`\n🔎 Rules only in Live (${liveRules.length - lumeRules.length} fewer in Lume):`);
  const liveOnlySelectors = liveRules
    .filter(liveRule => !findRule(lumeRules, liveRule.selector))
    .map(r => r.selector);

  if (liveOnlySelectors.length === 0) {
    console.log(`  (none)`);
  } else {
    liveOnlySelectors.forEach(selector => {
      console.log(`  - ${selector}`);
    });
  }

  console.log(`\n🔎 Rules only in Lume (${lumeRules.length - liveRules.length} extra in Lume):`);
  const lumeOnlySelectors = lumeRules
    .filter(lumeRule => !findRule(liveRules, lumeRule.selector))
    .map(r => r.selector);

  if (lumeOnlySelectors.length === 0) {
    console.log(`  (none)`);
  } else {
    lumeOnlySelectors.slice(0, 20).forEach(selector => {
      const rule = findRule(lumeRules, selector);
      console.log(`  - ${selector}`);
      if (rule) {
        const props = Object.entries(rule.properties).slice(0, 3);
        props.forEach(([prop, val]) => {
          console.log(`      ${prop}: ${val}`);
        });
        if (Object.keys(rule.properties).length > 3) {
          console.log(`      ... (${Object.keys(rule.properties).length - 3} more properties)`);
        }
      }
    });
    if (lumeOnlySelectors.length > 20) {
      console.log(`  ... (${lumeOnlySelectors.length - 20} more rules not shown)`);
    }
  }
}

async function main() {
  console.log("🎨 CSS Diff Tool");
  console.log("Comparing Lume CSS against live production sites\n");

  for (const comparison of COMPARISONS) {
    await compareCSSFiles(comparison);
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("✅ Comparison complete");
  console.log(`${"=".repeat(80)}\n`);
}

if (import.meta.main) {
  await main();
}
