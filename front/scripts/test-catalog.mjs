#!/usr/bin/env node
/**
 * Puppeteer test: catalog page and images.
 * Logs in, opens /catalog, counts cards and checks how many show real images vs placeholders.
 * Use to compare dev (127.0.0.1) vs amvara9 (satisfecho.de).
 *
 * Usage (from repo root):
 *   LOGIN_EMAIL=u@x.com LOGIN_PASSWORD=secret node front/scripts/test-catalog.mjs
 *   BASE_URL=http://satisfecho.de LOGIN_EMAIL=ralf@roeber.de LOGIN_PASSWORD=secret node front/scripts/test-catalog.mjs
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200 or http://satisfecho.de)
 *   LOGIN_EMAIL    Required for /catalog
 *   LOGIN_PASSWORD Required
 *   HEADLESS       Default headless; set 0, false, or no for a visible browser.
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  let baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    for (const port of [4203, 4202, 4200]) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`, {
          method: 'head',
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok || res.status < 500) {
          baseUrl = `http://127.0.0.1:${port}`;
          break;
        }
      } catch (_) {}
    }
    baseUrl = baseUrl || 'http://satisfecho.de';
  }

  const headless = isHeadless();
  const loginEmail = process.env.LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD;

  if (!loginEmail || !loginPassword) {
    console.error('Set LOGIN_EMAIL and LOGIN_PASSWORD.');
    process.exit(1);
  }

  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    // Login
    console.log('1. Logging in...');
    await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    await page.click('button[type="submit"]');
    await sleep(4000);
    if (page.url().includes('/login')) {
      console.log('   FAIL: Still on login page.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in.');

    // Catalog page
    console.log('2. Opening /catalog...');
    await page.goto(new URL('/catalog', baseUrl).href, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(3000);

    const catalogReport = await page.evaluate(() => {
      const cards = document.querySelectorAll('.catalog-card');
      let withImage = 0;
      let withPlaceholder = 0;
      let imageLoaded = 0;
      let imageFailed = 0;
      const failedSrcs = [];
      cards.forEach((card) => {
        const img = card.querySelector('.catalog-image img');
        const placeholder = card.querySelector('.catalog-image-placeholder');
        if (img) {
          withImage++;
          if (img.naturalWidth && img.naturalWidth > 0) imageLoaded++;
          else {
            imageFailed++;
            if (img.src) failedSrcs.push(img.src);
          }
        } else if (placeholder) {
          withPlaceholder++;
        }
      });
      return {
        total: cards.length,
        withImage,
        withPlaceholder,
        imageLoaded,
        imageFailed,
        failedSrcs: failedSrcs.slice(0, 5),
      };
    });

    console.log('3. Catalog report:');
    console.log('   Total cards:', catalogReport.total);
    console.log('   Cards with image element:', catalogReport.withImage);
    console.log('   Images loaded (naturalWidth>0):', catalogReport.imageLoaded);
    console.log('   Images failed (no dimensions):', catalogReport.imageFailed);
    console.log('   Cards with placeholder only:', catalogReport.withPlaceholder);
    if (catalogReport.failedSrcs.length) {
      console.log('   Sample failed image URLs:');
      catalogReport.failedSrcs.forEach((s) => console.log('     ', s));
    }

    await browser.close();

    const ok = catalogReport.total > 0;
    const imagesOk = catalogReport.imageFailed === 0 && (catalogReport.withImage === 0 || catalogReport.imageLoaded > 0);
    console.log('\n---');
    console.log('Catalog loaded:', ok ? 'OK' : 'FAIL (no cards)');
    console.log('Images OK:', imagesOk ? 'OK' : 'FAIL (some images missing or failed to load)');
    process.exit(ok && imagesOk ? 0 : 1);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
