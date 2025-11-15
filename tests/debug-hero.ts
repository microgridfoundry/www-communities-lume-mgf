#!/usr/bin/env -S deno run -A

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const LUME_BASE_URL = "http://localhost:8000";

async function debugHero() {
  console.log("🔍 Debugging hero image loading...\n");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('FAILED REQUEST:', request.url(), request.failure()?.errorText);
  });

  // Set cookie
  await page.setCookie({
    name: 'community',
    value: 'waterlilies',
    url: LUME_BASE_URL,
  });

  // Navigate to page
  console.log("Loading page with cookie...");
  await page.goto(LUME_BASE_URL, { waitUntil: "networkidle0" });

  // Check hero section
  const heroInfo = await page.evaluate(() => {
    const heroSection = document.querySelector('.hero-section') as HTMLElement;
    if (!heroSection) return { found: false };

    const style = window.getComputedStyle(heroSection);
    const backgroundImage = style.backgroundImage;

    return {
      found: true,
      backgroundImage,
      hasBackgroundImage: backgroundImage !== 'none',
      innerHTML: heroSection.innerHTML.substring(0, 200)
    };
  });

  console.log("\n📊 Hero Section Info:");
  console.log(JSON.stringify(heroInfo, null, 2));

  // Check all image requests
  console.log("\n🌐 All Network Requests:");
  const requests = await page.evaluate(() => {
    return performance.getEntries()
      .filter(e => e.entryType === 'resource')
      .map((e: any) => ({
        name: e.name,
        transferSize: e.transferSize,
        status: e.transferSize === 0 ? 'cached or failed' : 'ok'
      }));
  });

  requests.forEach(req => {
    if (req.name.includes('assets/images') || req.name.includes('.webp')) {
      console.log(`  ${req.status === 'ok' ? '✅' : '❌'} ${req.name} (${req.transferSize} bytes)`);
    }
  });

  await browser.close();
}

if (import.meta.main) {
  await debugHero();
}
