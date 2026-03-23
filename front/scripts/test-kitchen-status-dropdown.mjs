#!/usr/bin/env node
/**
 * Puppeteer test: Kitchen display – item status dropdown is visible and not clipped.
 * Logs in, opens /kitchen, clicks the first clickable item status badge (e.g. "Preparando"),
 * asserts the status dropdown appears and is fully visible in the viewport (not clipped by the order card).
 *
 * Usage (from repo root):
 *   LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-kitchen-status-dropdown.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:kitchen-status-dropdown --prefix front
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4202, 4203, 4200)
 *   LOGIN_EMAIL    Staff with order:item_status (e.g. owner, admin, kitchen)
 *   LOGIN_PASSWORD Password
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
    for (const port of [4202, 4203, 4200]) {
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
    baseUrl = baseUrl || 'http://127.0.0.1:4202';
  }

  const headless = isHeadless();
  const loginEmail = process.env.LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD;

  console.log('BASE_URL:', baseUrl);
  if (!loginEmail || !loginPassword) {
    console.error('LOGIN_EMAIL and LOGIN_PASSWORD are required.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 800 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    console.log('1. Logging in...');
    await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    await page.click('button[type="submit"]');
    await sleep(4000);
    if (page.url().includes('/login')) {
      console.error('FAIL: Login failed.');
      process.exit(1);
    }

    console.log('2. Opening /kitchen...');
    await page.goto(new URL('/kitchen', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    if (!page.url().includes('/kitchen')) {
      console.error('FAIL: Not on /kitchen.');
      process.exit(1);
    }

    console.log('3. Waiting for a clickable item status badge...');
    await page.waitForSelector('.kitchen-view .item-status-badge.clickable', { timeout: 15000 }).catch(() => null);
    const clickableCount = await page.$$eval('.kitchen-view .item-status-badge.clickable', (els) => els.length);
    if (clickableCount === 0) {
      console.log('   No clickable status badges (no active orders with non-delivered items). Skipping dropdown visibility check.');
      console.log('RESULT: Kitchen page loaded (no items to test).');
      await browser.close();
      process.exit(0);
    }

    console.log('4. Clicking first status badge...');
    await page.click('.kitchen-view .item-status-badge.clickable');
    await sleep(400);

    console.log('5. Checking status dropdown is visible and not clipped...');
    const dropdown = await page.$('[data-testid="kitchen-item-status-dropdown"]');
    if (!dropdown) {
      console.error('FAIL: Status dropdown did not appear.');
      process.exit(1);
    }

    const fullyVisible = await page.evaluate((el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= vh && rect.right <= vw && rect.width > 0 && rect.height > 0;
    }, dropdown);
    if (!fullyVisible) {
      const rect = await page.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
      }, dropdown);
      console.error('FAIL: Dropdown is clipped or outside viewport. BoundingClientRect:', rect);
      process.exit(1);
    }

    const hasForwardOption = await page.$eval('[data-testid="kitchen-item-status-dropdown"]', (el) => {
      const text = el.textContent || '';
      return text.includes('Move Forward') || text.includes('Forward') || text.includes('Ready') || text.includes('Listo') || text.includes('Fertig');
    }).catch(() => false);
    if (!hasForwardOption) {
      console.error('FAIL: Dropdown does not contain a forward option (Ready / Listo).');
      process.exit(1);
    }

    console.log('   Dropdown is fully visible in viewport.');
    console.log('RESULT: Kitchen status dropdown test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
