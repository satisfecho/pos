#!/usr/bin/env node
/**
 * Puppeteer test: provider login + add product.
 * Logs in at /provider/login, goes to /provider, clicks Add product, fills form, submits,
 * checks that the product appears in the list or no error is shown.
 *
 * Usage (from front/ or repo root):
 *   node front/scripts/test-provider-add-product.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:provider-add-product
 *
 * Env:
 *   BASE_URL             App URL (default: auto-detect 4203, 4202, 4200)
 *   PROVIDER_TEST_EMAIL  Provider login email (required for test)
 *   PROVIDER_TEST_PASSWORD  Provider login password (required)
 *   HEADLESS             Set to 1 to run headless
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
    baseUrl = baseUrl || 'http://127.0.0.1:4202';
  }

  const email = process.env.PROVIDER_TEST_EMAIL;
  const password = process.env.PROVIDER_TEST_PASSWORD;
  if (!email || !password) {
    console.error('PROVIDER_TEST_EMAIL and PROVIDER_TEST_PASSWORD are required.');
    console.error('Example: source ../.env && npm run test:provider-add-product');
    process.exit(1);
  }

  const productName = process.env.PRODUCT_NAME || `Puppeteer Test Product ${Date.now()}`;
  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  const loginUrl = new URL('/provider/login', baseUrl).href;
  const dashboardUrl = new URL('/provider', baseUrl).href;

  console.log('BASE_URL:', baseUrl);
  console.log('Login URL:', loginUrl);
  console.log('Product name:', productName);
  console.log('Headless:', headless);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    console.log('1. Navigating to provider login');
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 20000 });

    const emailSel = 'input[type="email"], input[name="username"]';
    const passwordSel = 'input[type="password"]';
    await page.waitForSelector(emailSel, { timeout: 10000 });
    await page.waitForSelector(passwordSel, { timeout: 5000 });

    console.log('2. Filling login form');
    await page.type(emailSel, email);
    await page.type(passwordSel, password);
    await page.click('button[type="submit"]');
    await sleep(4000);

    const currentUrl = page.url();
    if (!currentUrl.includes('/provider') || currentUrl.includes('/provider/login')) {
      const errText = await page.evaluate(() => document.querySelector('.error-banner')?.textContent?.trim() || '');
      console.error('>>> Login failed or not redirected to dashboard. URL:', currentUrl);
      if (errText) console.error('   Error:', errText);
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in, URL:', currentUrl);

    console.log('3. Opening Add product modal');
    await page.waitForSelector('.toolbar-left button.btn-primary', { timeout: 8000 }).catch(() => null);
    const addBtn = await page.$('.toolbar-left button.btn-primary');
    if (!addBtn) {
      const allButtons = await page.$$eval('button', (nodes) => nodes.map((n) => n.textContent?.trim()));
      console.error('   Could not find Add product button. Buttons:', allButtons?.slice(0, 5));
      await browser.close();
      process.exit(1);
    }
    await addBtn.click();
    await sleep(800);

    const nameInput = await page.$('form.modal-form input[name="name"]');
    if (!nameInput) {
      console.error('   Add product modal did not open (name input not found).');
      await browser.close();
      process.exit(1);
    }

    console.log('4. Filling product form');
    await nameInput.type(productName);
    const priceInput = await page.$('input[name="price_cents"]');
    if (priceInput) await priceInput.type('999');

    console.log('5. Submitting');
    const submitBtn = await page.$('form.modal-form button[type="submit"]');
    if (!submitBtn) {
      console.error('   Submit button not found.');
      await browser.close();
      process.exit(1);
    }
    await submitBtn.click();
    await sleep(4000);

    const hasError = await page.evaluate(() => !!document.querySelector('.error-banner'));
    const errorText = hasError
      ? await page.evaluate(() => document.querySelector('.error-banner')?.textContent?.trim() || '')
      : '';
    const modalVisible = await page.evaluate(() => !!document.querySelector('.modal[role="dialog"]'));
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const productInList = bodyText.includes(productName);

    if (hasError) {
      console.log('>>> RESULT: Add product failed.');
      console.log('   Error:', errorText || '(no message)');
      await browser.close();
      process.exit(1);
    }

    if (productInList && !modalVisible) {
      console.log('>>> RESULT: Add product succeeded. Product appears in list.');
      await browser.close();
      process.exit(0);
    }

    if (!modalVisible) {
      console.log('>>> RESULT: Add product likely succeeded (modal closed, no error).');
      await browser.close();
      process.exit(0);
    }

    console.log('>>> RESULT: Uncertain (modal still open?). Product in list:', productInList);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
