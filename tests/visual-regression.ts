#!/usr/bin/env -S deno run -A

import puppeteer from "puppeteer";
import pixelmatch from "pixelmatch";
import { decode, encode } from "https://deno.land/x/pngs@0.1.1/mod.ts";
import { join } from "@std/path";

// Configuration
const LUME_BASE_URL = "http://localhost:8000";
const LIVE_WATERLILIES_URL = "https://www.waterlilies.energy"; // Production Water Lilies site
const LIVE_HAZELMEAD_URL = "https://www.hazelmead.energy"; // Production Hazelmead site

const THRESHOLD = 0.1; // Pixel difference threshold (0-1)
const MIN_SIMILARITY = 98; // Minimum required similarity percentage

// Test cases: { name, lumePath, liveUrl, cookieValue }
const TEST_CASES = [
  // Water Lilies
  {
    name: "waterlilies-home",
    lumePath: "/",
    liveUrl: LIVE_WATERLILIES_URL + "/",
    community: "waterlilies",
  },
  {
    name: "waterlilies-support",
    lumePath: "/support/",
    liveUrl: LIVE_WATERLILIES_URL + "/support/",
    community: "waterlilies",
  },
  {
    name: "waterlilies-faq",
    lumePath: "/support/faq/",
    liveUrl: LIVE_WATERLILIES_URL + "/support/faq/",
    community: "waterlilies",
  },
  {
    name: "waterlilies-energyadvice",
    lumePath: "/support/energyadvice/",
    liveUrl: LIVE_WATERLILIES_URL + "/support/energyadvice/",
    community: "waterlilies",
  },
  // Hazelmead
  {
    name: "hazelmead-home",
    lumePath: "/",
    liveUrl: LIVE_HAZELMEAD_URL + "/",
    community: "hazelmead",
  },
  {
    name: "hazelmead-support",
    lumePath: "/support/",
    liveUrl: LIVE_HAZELMEAD_URL + "/support/",
    community: "hazelmead",
  },
  {
    name: "hazelmead-faq",
    lumePath: "/support/faq/",
    liveUrl: LIVE_HAZELMEAD_URL + "/support/faq/",
    community: "hazelmead",
  },
  {
    name: "hazelmead-energyadvice",
    lumePath: "/support/energyadvice/",
    liveUrl: LIVE_HAZELMEAD_URL + "/support/energyadvice/",
    community: "hazelmead",
  },
];

// Viewport sizes to test
const VIEWPORTS = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "laptop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

interface TestResult {
  name: string;
  viewport: string;
  similarity: number;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
const updateBaseline = Deno.args.includes("--update-baseline");
const quickMode = Deno.args.includes("--quick");

async function captureScreenshot(
  browser: puppeteer.Browser,
  url: string,
  viewport: { width: number; height: number },
  setCookie?: { name: string; value: string },
): Promise<Buffer> {
  const page = await browser.newPage();
  await page.setViewport(viewport);

  if (setCookie) {
    await page.setCookie({
      name: setCookie.name,
      value: setCookie.value,
      url: LUME_BASE_URL,
    });
  }

  await page.goto(url, { waitUntil: "networkidle0" });

  // Wait for any animations to complete
  await new Promise((resolve) => setTimeout(resolve, 500));

  const screenshot = await page.screenshot({ fullPage: true });
  await page.close();

  return screenshot as Buffer;
}

// Convert RGB to RGBA (pixelmatch expects RGBA)
function rgbToRgba(rgb: Uint8Array, width: number, height: number): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  let rgbaIndex = 0;

  for (let i = 0; i < rgb.length; i += 3) {
    rgba[rgbaIndex++] = rgb[i];     // R
    rgba[rgbaIndex++] = rgb[i + 1]; // G
    rgba[rgbaIndex++] = rgb[i + 2]; // B
    rgba[rgbaIndex++] = 255;        // A (fully opaque)
  }

  return rgba;
}

function compareImages(img1: Uint8Array, img2: Uint8Array): number {
  const png1 = decode(img1);
  const png2 = decode(img2);

  // Ensure images are the same size
  if (png1.width !== png2.width || png1.height !== png2.height) {
    throw new Error(
      `Image dimensions don't match: ${png1.width}x${png1.height} vs ${png2.width}x${png2.height}`,
    );
  }

  const { width, height } = png1;

  // Convert RGB to RGBA if needed (colorType 2 is RGB)
  const data1 = png1.colorType === 2
    ? rgbToRgba(png1.image, width, height)
    : png1.image;
  const data2 = png2.colorType === 2
    ? rgbToRgba(png2.image, width, height)
    : png2.image;

  const diff = new Uint8Array(width * height * 4);

  const numDiffPixels = pixelmatch(
    data1,
    data2,
    diff,
    width,
    height,
    { threshold: THRESHOLD },
  );

  const totalPixels = width * height;
  const similarity = ((totalPixels - numDiffPixels) / totalPixels) * 100;

  return similarity;
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function runTest(
  browser: puppeteer.Browser,
  testCase: typeof TEST_CASES[0],
  viewport: typeof VIEWPORTS[0],
) {
  const testName = `${testCase.name}-${viewport.name}`;
  console.log(`\n📸 Testing: ${testName}`);

  try {
    // Capture Lume screenshot
    console.log(`  Capturing Lume: ${LUME_BASE_URL}${testCase.lumePath}`);
    const lumeScreenshot = await captureScreenshot(
      browser,
      LUME_BASE_URL + testCase.lumePath,
      viewport,
      { name: "community", value: testCase.community },
    );

    const baselinePath = join(
      "tests",
      "screenshots",
      "baseline",
      `${testName}.png`,
    );
    const currentPath = join(
      "tests",
      "screenshots",
      "current",
      `${testName}.png`,
    );
    const diffPath = join("tests", "screenshots", "diff", `${testName}.png`);

    // Ensure current directory exists
    await Deno.mkdir(join("tests", "screenshots", "current"), {
      recursive: true,
    });

    // Save current screenshot
    await Deno.writeFile(currentPath, lumeScreenshot);

    if (updateBaseline) {
      // Check if live URL exists first
      console.log(`  Checking live site: ${testCase.liveUrl}`);
      const liveUrlExists = await checkUrl(testCase.liveUrl);

      if (!liveUrlExists) {
        console.log(`  ⚠️  Live URL returned 404 or error - skipping baseline`);
        results.push({
          name: testName,
          viewport: viewport.name,
          similarity: 0,
          passed: false,
          error: "Live URL not found (404)",
        });
        return;
      }

      // Capture live site screenshot and save as baseline
      console.log(`  Capturing live site: ${testCase.liveUrl}`);
      const liveScreenshot = await captureScreenshot(
        browser,
        testCase.liveUrl,
        viewport,
      );
      await Deno.mkdir(join("tests", "screenshots", "baseline"), {
        recursive: true,
      });
      await Deno.writeFile(baselinePath, liveScreenshot);
      console.log(`  ✅ Baseline updated: ${baselinePath}`);
      results.push({
        name: testName,
        viewport: viewport.name,
        similarity: 100,
        passed: true,
      });
    } else {
      // Compare with existing baseline
      try {
        const baselineScreenshot = await Deno.readFile(baselinePath);
        const similarity = compareImages(baselineScreenshot, lumeScreenshot);
        const passed = similarity >= MIN_SIMILARITY;

        if (!passed) {
          // Generate diff image
          const png1 = decode(baselineScreenshot);
          const png2 = decode(lumeScreenshot);
          const { width, height } = png1;

          // Convert RGB to RGBA if needed
          const data1 = png1.colorType === 2
            ? rgbToRgba(png1.image, width, height)
            : png1.image;
          const data2 = png2.colorType === 2
            ? rgbToRgba(png2.image, width, height)
            : png2.image;

          const diff = new Uint8Array(width * height * 4);

          pixelmatch(data1, data2, diff, width, height, {
            threshold: THRESHOLD,
          });

          // Ensure diff directory exists
          await Deno.mkdir(join("tests", "screenshots", "diff"), {
            recursive: true,
          });

          // Encode diff as PNG (RGBA)
          const diffPng = encode(diff, width, height, {
            colorType: 6, // RGBA
            bitDepth: 8,
          });
          await Deno.writeFile(diffPath, diffPng);
          console.log(`  📊 Diff image saved: ${diffPath}`);
        }

        const status = passed ? "✅ PASS" : "❌ FAIL";
        console.log(`  ${status} - Similarity: ${similarity.toFixed(2)}%`);

        results.push({
          name: testName,
          viewport: viewport.name,
          similarity,
          passed,
        });
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          console.log(
            `  ⚠️  Baseline not found. Run with --update-baseline first.`,
          );
          results.push({
            name: testName,
            viewport: viewport.name,
            similarity: 0,
            passed: false,
            error: "Baseline not found",
          });
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    results.push({
      name: testName,
      viewport: viewport.name,
      similarity: 0,
      passed: false,
      error: error.message,
    });
  }
}

async function main() {
  console.log("🚀 Starting visual regression tests...\n");

  if (updateBaseline) {
    console.log("📝 UPDATE BASELINE MODE - Capturing production site screenshots\n");
    console.log("🌐 Live sites:");
    console.log(`   Water Lilies: ${LIVE_WATERLILIES_URL}`);
    console.log(`   Hazelmead: ${LIVE_HAZELMEAD_URL}\n`);
  } else {
    console.log("🔍 COMPARISON MODE - Comparing against baseline\n");
  }

  console.log(`📍 Lume server: ${LUME_BASE_URL}`);
  console.log(`📊 Min similarity: ${MIN_SIMILARITY}%`);
  console.log(`🎯 Threshold: ${THRESHOLD}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // In quick mode, only test home pages in desktop and laptop
    if (quickMode) {
      console.log("🚀 QUICK MODE - Testing home pages only (desktop + laptop)\n");
      const quickTestCases = TEST_CASES.filter((tc) => tc.name.endsWith("-home"));
      const quickViewports = VIEWPORTS.filter((vp) =>
        vp.name === "desktop" || vp.name === "laptop"
      );

      for (const testCase of quickTestCases) {
        for (const viewport of quickViewports) {
          await runTest(browser, testCase, viewport);
        }
      }
    } else {
      for (const testCase of TEST_CASES) {
        for (const viewport of VIEWPORTS) {
          await runTest(browser, testCase, viewport);
        }
      }
    }
  } finally {
    await browser.close();
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const avgSimilarity =
    results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

  console.log(`\nTotal tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Average similarity: ${avgSimilarity.toFixed(2)}%\n`);

  if (failed > 0) {
    console.log("Failed tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(
          `  - ${r.name}: ${r.similarity.toFixed(2)}% ${r.error ? `(${r.error})` : ""}`,
        );
      });
  }

  console.log("\n" + "=".repeat(80));

  // Exit with error code if tests failed
  if (failed > 0 && !updateBaseline) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
