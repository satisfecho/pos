#!/usr/bin/env node
/**
 * Puppeteer test: registration flow (create account).
 * Opens /register, fills form, submits, checks for success.
 * Default: headless false so you can watch the browser.
 *
 * Usage (from front/ or repo root):
 *   node front/scripts/test-register.mjs
 *   BASE_URL=http://satisfecho.de node front/scripts/test-register.mjs
 *
 * Env:
 *   BASE_URL          App URL (default: auto-detect 4203, 4202, 4200, or http://satisfecho.de)
 *   REGISTER_EMAIL    Email (default: test-<timestamp>@example.com)
 *   REGISTER_PASSWORD Password (default: testpass123)
 *   REGISTER_FULL_NAME Full name (default: Test User)
 *   REGISTER_TENANT_NAME Organization name (default: Test Restaurant)
 *   HEADLESS          Set to 1 to run headless (default: 0 = visible browser so you can watch)
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
  const registerUrl = new URL('/register', baseUrl).href;

  const email = process.env.REGISTER_EMAIL || `test-${Date.now()}@example.com`;
  const password = process.env.REGISTER_PASSWORD || 'testpass123';
  const fullName = process.env.REGISTER_FULL_NAME || 'Test User';
  const tenantName = process.env.REGISTER_TENANT_NAME || 'Test Restaurant';

  // Default visible browser for this test (set HEADLESS=1 to run headless)
  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';

  console.log('Launching Chrome at', CHROME_PATH);
  console.log('Register URL:', registerUrl);
  console.log('Email:', email);
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
    console.log('1. Navigating to', registerUrl);
    await page.goto(registerUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('   URL after load:', page.url());

    console.log('2. Filling registration form');
    await page.type('#tenant', tenantName);
    await page.type('#name', fullName);
    await page.type('#email', email);
    await page.type('#password', password);

    console.log('3. Submitting');
    await page.click('button[type="submit"].btn-submit');
    await sleep(5000);

    const hasSuccess = await page.evaluate(() => !!document.querySelector('.success-banner'));
    const hasError = await page.evaluate(() => !!document.querySelector('.error-banner'));
    const errorText = hasError
      ? await page.evaluate(() => document.querySelector('.error-banner')?.textContent?.trim() || '')
      : '';
    const currentUrl = page.url();

    if (hasSuccess) {
      console.log('>>> RESULT: Registration successful (success banner shown).');
      if (currentUrl.includes('/login')) console.log('   Redirected to login.');
    } else if (currentUrl.includes('/login') && !hasError) {
      console.log('>>> RESULT: Registration successful (redirected to login).');
    } else if (hasError) {
      console.log('>>> RESULT: Registration failed.');
      console.log('   Error:', errorText || '(no message)');
      process.exit(1);
    } else {
      console.log('>>> RESULT: Unknown state (no success or error banner).');
      console.log('   URL:', currentUrl);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
