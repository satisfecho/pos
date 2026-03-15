#!/usr/bin/env node
/**
 * Puppeteer test: order #8 (or ORDER_ID) – open status dropdown and verify "next status" is shown.
 * Logs in, goes to /orders, finds the order, clicks the status badge, asserts the forward option appears.
 *
 * Usage (from repo root):
 *   LOGIN_EMAIL=user@example.com LOGIN_PASSWORD=secret node front/scripts/test-order-8-status.mjs
 *   ORDER_ID=8 BASE_URL=http://127.0.0.1:4203 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-order-8-status.mjs
 *
 * Env:
 *   BASE_URL        App URL (default: auto-detect 4203, 4202, 4200 or http://satisfecho.de)
 *   LOGIN_EMAIL     Staff user email (required)
 *   LOGIN_PASSWORD  Staff password (required)
 *   ORDER_ID        Order number to test (default: 8)
 *   HEADLESS        Set to 1 to run headless (default: 0)
 */

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

  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  const loginEmail = process.env.LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD;
  const orderId = process.env.ORDER_ID || '8';

  console.log('BASE_URL:', baseUrl);
  console.log('ORDER_ID:', orderId);
  console.log('Headless:', headless);
  if (!loginEmail || !loginPassword) {
    console.log('FAIL: LOGIN_EMAIL and LOGIN_PASSWORD are required.');
    process.exit(1);
  }
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[browser]', msg.text()));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    // 1. Login
    console.log('1. Logging in...');
    await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(3000);
    }
    if (page.url().includes('/login')) {
      console.log('   FAIL: Still on login page (check credentials).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in, URL:', page.url());

    // 2. Go to orders
    console.log('2. Navigating to /orders...');
    await page.goto(new URL('/orders', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('.order-grid .order-card, .order-card, app-orders', { timeout: 10000 }).catch(() => {});
    await sleep(1500);

    // 3. Find order card for #orderId (e.g. #8)
    const orderLabel = '#' + orderId;
    const cardFound = await page.evaluate((label) => {
      const cards = document.querySelectorAll('.order-card');
      for (const card of cards) {
        const idEl = card.querySelector('.order-id');
        if (idEl && idEl.textContent.trim() === label) return true;
      }
      return false;
    }, orderLabel);

    if (!cardFound) {
      console.log('   FAIL: Order', orderLabel, 'not found in the orders list (ensure it is in Active Orders).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Order', orderLabel, 'card found.');

    // 4. Click the order-level status button inside that card
    const statusClicked = await page.evaluate((label) => {
      const cards = document.querySelectorAll('.order-card');
      for (const card of cards) {
        const idEl = card.querySelector('.order-id');
        if (idEl && idEl.textContent.trim() === label) {
          const btn = card.querySelector('.status-control .status-badge-btn');
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        }
      }
      return false;
    }, orderLabel);

    if (!statusClicked) {
      console.log('   FAIL: Could not find status button for order', orderLabel);
      await browser.close();
      process.exit(1);
    }
    console.log('   Clicked status button.');

    // 5. Wait for dropdown to show and get forward option text
    await sleep(500);
    const dropdownInfo = await page.evaluate(() => {
      const dropdown = document.querySelector('.status-control .status-dropdown');
      if (!dropdown) return { visible: false, forwardTexts: [] };
      const style = window.getComputedStyle(dropdown);
      const rect = dropdown.getBoundingClientRect();
      const visible = style.display !== 'none' && rect.width > 0 && rect.height > 0;
      const forwardBtns = dropdown.querySelectorAll('.dropdown-item.forward');
      const forwardTexts = Array.from(forwardBtns).map((b) => (b.textContent || '').trim());
      return { visible, forwardTexts };
    });

    if (!dropdownInfo.visible) {
      console.log('   FAIL: Status dropdown did not appear or is not visible.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Dropdown visible. Forward options:', dropdownInfo.forwardTexts);

    // 6. For a "pending" order the next status should be "Preparing" (or translated equivalent)
    const hasPreparing = dropdownInfo.forwardTexts.some(
      (t) => t.toLowerCase().includes('preparing') || t.toLowerCase().includes('vorbereit') || t.toLowerCase().includes('prepar')
    );
    if (dropdownInfo.forwardTexts.length === 0) {
      console.log('   FAIL: No "Move forward" options in dropdown (expected at least "Preparing" for pending).');
      await browser.close();
      process.exit(1);
    }
    if (!hasPreparing && dropdownInfo.forwardTexts.length > 0) {
      // Might be already in another status (e.g. ready -> Completed)
      console.log('   Note: "Preparing" not in forward list; order may not be pending. Forward options:', dropdownInfo.forwardTexts);
    }

    console.log('\n>>> RESULT: Order', orderLabel, 'status dropdown opens and shows next status options.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
