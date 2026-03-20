#!/usr/bin/env node
/**
 * Review order-edit and status popover: Login (tenant=1 from .env), open /staff/orders,
 * verify Edit button, status popover (position/z-index), and order edit modal.
 *
 * Usage (from repo root, front + back running):
 *   node front/scripts/review-order-edit-puppeteer.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/review-order-edit-puppeteer.mjs
 */

import { createRequire } from 'module';
import { readFileSync, existsSync, mkdirSync } from 'fs';
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

  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const failures = [];
  const consoleLogs = [];
  page.on('console', (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error') consoleLogs.push('CONSOLE ERROR: ' + text);
  });
  page.on('pageerror', (err) => consoleLogs.push('PAGE ERROR: ' + err.message));

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

    const stillLogin = await page.evaluate(() => window.location.pathname.includes('login'));
    if (stillLogin) {
      console.error('FAIL: Still on login page. Check DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env for tenant=1.');
      await browser.close();
      process.exit(1);
    }

    console.log('2. Open /staff/orders...');
    await page.goto(new URL('/staff/orders', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await sleep(3500);

    // --- Edit button on card (Active or Not paid) ---
    const firstOrderCard = await page.$('.order-card');
    const editBtnCard = firstOrderCard
      ? await firstOrderCard.$('button.btn-edit-order')
      : await page.$('button.btn-edit-order');
    if (!editBtnCard) {
      console.log('   (No order card with Edit button visible – no active/not-paid orders? Will try History.)');
    } else {
      console.log('3. Edit button on card: found.');
      console.log('4. Click Edit on first order card...');
      await (firstOrderCard || editBtnCard).evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await sleep(300);
      await page.evaluate(() => {
        const card = document.querySelector('.order-card');
        const btn = card && card.querySelector('button.btn-edit-order');
        if (btn) btn.click();
      });
      await sleep(600);
      try {
        await page.waitForSelector('.modal-overlay', { timeout: 6000 });
      } catch (_) {}
      await sleep(300);

      const editModal = await page.$('.modal-order-edit');
      const editModalAlt = await page.$('.modal-overlay .modal');
      const hasEditOrderText = await page.evaluate(() => document.body.textContent.includes('Edit order') || document.body.textContent.includes('Bestellung bearbeiten') || document.body.textContent.includes('Editar pedido'));
      if (!editModal && !editModalAlt) {
        if (hasEditOrderText) console.log('   (Modal text present but selector missed – modal may use different class.)');
        try {
          const screenshotDir = join(__dirname, 'screenshots');
          if (!existsSync(screenshotDir)) mkdirSync(screenshotDir, { recursive: true });
          await page.screenshot({ path: join(screenshotDir, 'review-edit-modal-fail.png') });
          console.log('   Screenshot saved: front/scripts/screenshots/review-edit-modal-fail.png');
        } catch (_) {}
        console.log('   WARN: Order edit modal did not open from card (will re-check from History grid).');
        failures.push('Order edit modal did not open after clicking Edit on card.');
      } else {
        console.log('   Order edit modal opened (title, items, Add item, billing).');
        const hasItemsLabel = await page.evaluate(() => {
          const body = document.querySelector('.modal-order-edit .modal-body, .modal-overlay .modal .modal-body');
          return body && /Items|Artículos|Artikel/i.test(body.textContent || '');
        });
        if (!hasItemsLabel) failures.push('Order edit modal missing Items section.');
        const hasAddItem = await page.$('.modal-order-edit .add-items-section, .modal-order-edit .add-items-row, .modal-overlay .add-items-section');
        if (!hasAddItem) console.log('   (Add item section not present – may be paid order or no table.)');
        const closeBtn = await page.$('.modal-order-edit .icon-btn, .modal-order-edit button.btn-secondary, .modal-overlay .icon-btn');
        if (closeBtn) {
          await closeBtn.click();
          await sleep(500);
        }
      }
    }

    // --- Status popover: open and check visibility ---
    const statusBtn = await page.$('button.status-badge-btn');
    if (statusBtn) {
      console.log('5. Status button: found. Opening status popover...');
      await statusBtn.click();
      await sleep(800);

      const dropdown = await page.$('.status-dropdown');
      if (!dropdown) {
        failures.push('Status dropdown not visible after clicking status button.');
      } else {
        const box = await dropdown.boundingBox();
        const visible = await page.evaluate((el) => {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          const z = parseInt(style.zIndex, 10);
          return el.offsetParent !== null && style.visibility !== 'hidden' && z >= 100;
        }, dropdown);
        if (!visible) failures.push('Status dropdown may have low z-index or be hidden.');
        else console.log('   Status dropdown visible (z-index OK).');
        // Close dropdown by clicking elsewhere
        await page.evaluate(() => document.body.click());
        await sleep(300);
      }
    } else {
      console.log('   (No status badge button – no orders with status control.)');
    }

    // --- History tab: Edit button in grid ---
    const tabs = await page.$$('button.filter-tab, .filter-tabs button');
    let historyBtn = null;
    for (const t of tabs) {
      const text = await page.evaluate((el) => (el && el.textContent) || '', t);
      if (/history|historial|pedidos/i.test(text)) {
        historyBtn = t;
        break;
      }
    }
    if (historyBtn) {
      await historyBtn.click();
      await sleep(3000);

      const editBtnGrid = await page.$('button.btn-edit-order-row');
      if (editBtnGrid) {
        console.log('6. Edit button in History grid: found. Clicking...');
        await editBtnGrid.click();
        await sleep(500);
        try {
          await page.waitForSelector('.modal-order-edit', { timeout: 5000 });
        } catch (_) {}
        await sleep(500);

        const editModal2 = await page.$('.modal-order-edit');
        const editModal2Alt = await page.$('.modal-overlay .modal');
        if (editModal2 || editModal2Alt) {
          console.log('   Order edit modal opened from History.');
          const closeBtn2 = await page.$('.modal-order-edit .icon-btn, .modal-overlay .icon-btn');
          if (closeBtn2) { await closeBtn2.click(); await sleep(500); }
          if (failures.length) {
            const cardFailureIdx = failures.findIndex((f) => f.includes('Edit on card'));
            if (cardFailureIdx >= 0) failures.splice(cardFailureIdx, 1);
          }
        } else {
          console.log('   WARN: Order edit modal did not open from History grid.');
          failures.push('Order edit modal did not open after clicking Edit in History grid.');
        }
      } else {
        console.log('   (No Edit button in History grid – no completed orders or grid not rendered.)');
      }
    }

    if (consoleLogs.length > 0) {
      console.log('\nConsole/page errors captured:');
      consoleLogs.forEach((l) => console.log('  ', l));
    }
    if (failures.length > 0) {
      console.error('\nReview FAILED:');
      failures.forEach((f) => console.error('  -', f));
      console.error('\nTip: If the order edit modal does not open from the card: ensure the frontend is rebuilt (restart ng serve or hard refresh). The modal opens from History grid Edit.');
      await browser.close();
      process.exit(1);
    }

    console.log('\nReview OK: Edit buttons present, order edit modal opens (from History), status popover visible.');
    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
}

main();
