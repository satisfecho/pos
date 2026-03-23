#!/usr/bin/env node
/**
 * Puppeteer: Login (tenant=1 from .env), open /staff/orders, click "Open menu" on first order,
 * then on the opened menu tab add a product and place order. Asserts that the PIN modal
 * does NOT appear (staff link should skip PIN).
 *
 * Usage (from repo root, with front + back running):
 *   node front/scripts/test-staff-menu-link-puppeteer.mjs
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-staff-menu-link-puppeteer.mjs
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const repoRoot = resolve(__dirname, '..', '..');

function loadEnv() {
  const envPath = join(repoRoot, '.env');
  if (existsSync(envPath)) {
    try {
      readFileSync(envPath, 'utf8')
        .split('\n')
        .forEach((line) => {
          const m = line.match(/^([^#=]+)=(.*)$/);
          if (m && !process.env[m[1].trim()]) {
            process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
          }
        });
    } catch (_) {}
  }
}
loadEnv();

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4202';
  const loginEmail = process.env.LOGIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;
  const tenantId = process.env.TENANT_ID || '1';

  if (!loginEmail || !loginPassword) {
    console.error('Set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: isHeadless(),
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    console.log('1. Login (tenant=' + tenantId + ')...');
    await page.goto(new URL('/login?tenant=' + tenantId, baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    await page.click('button[type="submit"]');
    await sleep(4000);

    console.log('2. Open /staff/orders...');
    await page.goto(new URL('/staff/orders', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await sleep(2500);

    const openMenuBtn = await page.$('button.btn-menu-link');
    if (!openMenuBtn) {
      console.error('FAIL: No "Open menu" button found. Ensure there is at least one order with a table.');
      await browser.close();
      process.exit(1);
    }

    const newPagePromise = new Promise((resolve) => {
      browser.once('targetcreated', (target) => {
        resolve(target.page());
      });
    });

    console.log('3. Click "Open menu" (opens new tab)...');
    await openMenuBtn.click();
    const menuPage = await newPagePromise;
    if (!menuPage) {
      console.error('FAIL: New tab did not open.');
      await browser.close();
      process.exit(1);
    }
    await menuPage.bringToFront();
    await sleep(3000);

    const menuUrl = menuPage.url();
    const hasStaffAccess = menuUrl.includes('staff_access=');
    console.log('   Menu tab URL has staff_access:', hasStaffAccess, menuUrl.split('?')[1]?.slice(0, 50) + '...');

    if (!hasStaffAccess) {
      console.error('FAIL: Opened URL does not contain staff_access query param.');
      await browser.close();
      process.exit(1);
    }

    console.log('4. Wait for menu to load and close name modal if present...');
    await sleep(2000);
    const skipped = await menuPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skip = buttons.find((b) => /skip|omitir|weglassen/i.test(b.textContent || ''));
      if (skip) {
        skip.click();
        return true;
      }
      return false;
    });
    if (skipped) await sleep(500);

    console.log('5. Add first product to cart (click add or product card)...');
    const addBtn = await menuPage.$('button.add-to-cart-btn');
    if (!addBtn) {
      const productCard = await menuPage.$('.product-card, [class*="product"]');
      if (productCard) await productCard.click();
      await sleep(1000);
      const addFromSheet = await menuPage.$('button.add-to-cart-btn');
      if (addFromSheet) await addFromSheet.click();
    } else {
      await addBtn.click();
    }
    await sleep(1500);

    console.log('6. Click Place order / Add to order...');
    const placeBtn = await menuPage.$('button.place-order-btn');
    if (!placeBtn) {
      console.error('FAIL: Place order button not found.');
      await browser.close();
      process.exit(1);
    }
    await placeBtn.click();
    await sleep(2500);

    const pinVisible = await menuPage.evaluate(() => {
      const pinInput = document.querySelector('.pin-input');
      if (!pinInput) return false;
      const modal = pinInput.closest('.modal-overlay, .modal-sheet');
      return modal && modal.offsetParent !== null;
    });

    if (pinVisible) {
      console.error('FAIL: PIN modal is visible after placing order via staff link. Staff access should skip PIN.');
      await browser.close();
      process.exit(1);
    }

    console.log('PASS: No PIN modal shown; staff link correctly skips PIN.');
    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
}

main();
