#!/usr/bin/env node
/**
 * Puppeteer test: verify demo data is in place (tables T01–T10, products).
 * Logs in then fetches /api/products and /api/tables/with-status; asserts counts.
 * Optional: open /book/1 (or BOOK_TENANT_ID) to verify public book page (no login).
 *
 * Usage (from repo root):
 *   BASE_URL=http://satisfecho.de LOGIN_EMAIL=ralf@roeber.de LOGIN_PASSWORD=secret node front/scripts/test-demo-data.mjs
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect or http://satisfecho.de)
 *   LOGIN_EMAIL    User email (required for products/tables check)
 *   LOGIN_PASSWORD Password
 *   BOOK_TENANT_ID Tenant id for public book page check (default: 1)
 *   HEADLESS       Set to 1 to run headless (default: 0 = visible browser)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIN_TABLES = 10;  // T01–T10
const MIN_PRODUCTS = 10;

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
  const bookTenantId = process.env.BOOK_TENANT_ID || '1';

  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  if (!loginEmail || !loginPassword) {
    console.log('LOGIN_EMAIL/LOGIN_PASSWORD not set – will only check public /book/' + bookTenantId + '.');
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

  let tablesCount = 0;
  let productsCount = 0;
  let bookPageOk = false;

  try {
    // 1. Public book page (no auth): book form should load for tenant
    console.log('1. Checking public /book/' + bookTenantId + '...');
    await page.goto(new URL('/book/' + bookTenantId, baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    bookPageOk = await page.evaluate(() => !!document.querySelector('.book-form'));
    console.log('   Book form present:', bookPageOk);
    if (!bookPageOk) {
      console.log('   FAIL: /book/' + bookTenantId + ' should show booking form.');
    }

    if (!loginEmail || !loginPassword) {
      await browser.close();
      process.exit(bookPageOk ? 0 : 1);
    }

    // 2. Login
    console.log('2. Logging in...');
    await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(4000);
    }
    const afterLogin = page.url();
    if (afterLogin.includes('/login')) {
      console.log('   FAIL: Still on login page (check credentials).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in, URL:', afterLogin);

    // 3. Fetch /api/products (same origin, cookies sent)
    console.log('3. Fetching /api/products...');
    const products = await page.evaluate(async (url) => {
      const res = await fetch(`${url}/api/products`, { credentials: 'include' });
      if (!res.ok) return { error: res.status };
      return res.json();
    }, baseUrl);
    if (products.error) {
      console.log('   FAIL: products API returned', products.error);
    } else {
      productsCount = Array.isArray(products) ? products.length : 0;
      console.log('   Products count:', productsCount);
    }

    // 4. Fetch /api/tables/with-status
    console.log('4. Fetching /api/tables/with-status...');
    const tables = await page.evaluate(async (url) => {
      const res = await fetch(`${url}/api/tables/with-status`, { credentials: 'include' });
      if (!res.ok) return { error: res.status };
      return res.json();
    }, baseUrl);
    if (tables.error) {
      console.log('   FAIL: tables API returned', tables.error);
    } else {
      tablesCount = Array.isArray(tables) ? tables.length : 0;
      console.log('   Tables count:', tablesCount);
    }

    await browser.close();

    const tablesOk = tablesCount >= MIN_TABLES;
    const productsOk = productsCount >= MIN_PRODUCTS;
    console.log('\n---');
    console.log('Book page (/book/' + bookTenantId + '):', bookPageOk ? 'OK' : 'FAIL');
    console.log('Tables (≥' + MIN_TABLES + '):', tablesOk ? `OK (${tablesCount})` : `FAIL (${tablesCount})`);
    console.log('Products (≥' + MIN_PRODUCTS + '):', productsOk ? `OK (${productsCount})` : `FAIL (${productsCount})`);
    if (bookPageOk && tablesOk && productsOk) {
      console.log('\n>>> RESULT: Demo data in place.');
      process.exit(0);
    }
    console.log('\n>>> RESULT: Demo data missing or incomplete.');
    process.exit(1);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
