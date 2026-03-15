#!/usr/bin/env node
/**
 * Puppeteer test: tables page — view toggle (Tiles / Table) and table view.
 * Logs in, opens /tables, asserts view toggle when tables exist, switches to Table view
 * and asserts the data table (.tables-data-table) with columns is present.
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203/4202/4200 or satisfecho.de)
 *   LOGIN_EMAIL    Staff user email (required)
 *   LOGIN_PASSWORD Password
 *   HEADLESS       Set to 1 for headless (default: 0)
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

  if (!loginEmail || !loginPassword) {
    console.error('LOGIN_EMAIL and LOGIN_PASSWORD are required.');
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
    console.log('   OK: Logged in');

    // 2. Open /tables
    console.log('2. Opening /tables...');
    await page.goto(new URL('/tables', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);

    const url = page.url();
    if (!url.includes('/tables') || url.includes('/login')) {
      console.log('   FAIL: Not on tables page, URL:', url);
      await browser.close();
      process.exit(1);
    }
    console.log('   OK: On tables page');

    // 3. If view toggle exists (we have tables), switch to Table view and assert data table
    const viewToggle = await page.$('.view-toggle');
    if (viewToggle) {
      console.log('3. View toggle present; switching to Table view...');
      const tableViewButton = await page.$('.view-toggle button:nth-child(2)');
      if (!tableViewButton) {
        console.log('   FAIL: Table view button not found');
        await browser.close();
        process.exit(1);
      }
      await tableViewButton.click();
      await sleep(500);

      const dataTable = await page.$('.tables-data-table');
      if (!dataTable) {
        console.log('   FAIL: .tables-data-table not found after clicking Table view');
        await browser.close();
        process.exit(1);
      }

      const hasHeaderCells = await page.evaluate(() => {
        const ths = document.querySelectorAll('.tables-data-table thead th');
        return ths.length >= 5;
      });
      if (!hasHeaderCells) {
        console.log('   FAIL: Data table has no/few header columns');
        await browser.close();
        process.exit(1);
      }
      console.log('   OK: Table view shows data table with columns');
    } else {
      console.log('3. No view toggle (no tables or empty state); tables page loaded OK.');
    }

    await browser.close();
    console.log('\n>>> RESULT: Tables page test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
