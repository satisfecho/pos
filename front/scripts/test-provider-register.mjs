#!/usr/bin/env node
/**
 * Puppeteer test: provider registration flow.
 * Opens /provider/register, fills form, submits, checks for success or reports error.
 *
 * Usage (from front/ or repo root):
 *   node front/scripts/test-provider-register.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:provider-register
 *
 * Env:
 *   BASE_URL             App URL (default: auto-detect 4203, 4202, 4200 or http://satisfecho.de)
 *   PROVIDER_NAME       Provider/company name (default: Test Provider <timestamp>)
 *   PROVIDER_EMAIL      Email (default: provider-<timestamp>@example.com)
 *   PROVIDER_PASSWORD   Password (default: testpass123)
 *   PROVIDER_FULL_NAME  Full name (default: Test Provider User)
 *   HEADLESS            Set to 1 to run headless (default: 0)
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

  const ts = Date.now();
  const providerName = process.env.PROVIDER_NAME || `Test Provider ${ts}`;
  const email = process.env.PROVIDER_EMAIL || `provider-${ts}@example.com`;
  const password = process.env.PROVIDER_PASSWORD || 'testpass123';
  const fullName = process.env.PROVIDER_FULL_NAME || 'Test Provider User';

  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  const registerUrl = new URL('/provider/register', baseUrl).href;

  console.log('BASE_URL:', baseUrl);
  console.log('Provider register URL:', registerUrl);
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

    await page.waitForSelector('input#provider_name', { timeout: 10000 });

    console.log('2. Filling provider registration form');
    await page.type('#provider_name', providerName);
    await page.type('#full_name', fullName);
    await page.type('#email', email);
    await page.type('#password', password);

    console.log('3. Submitting');
    await page.click('button[type="submit"].btn-submit');
    await sleep(6000);

    const hasSuccess = await page.evaluate(() => !!document.querySelector('.success-banner'));
    const hasError = await page.evaluate(() => !!document.querySelector('.error-banner'));
    const successText = hasSuccess
      ? await page.evaluate(() => document.querySelector('.success-banner')?.textContent?.trim() || '')
      : '';
    const errorText = hasError
      ? await page.evaluate(() => document.querySelector('.error-banner')?.textContent?.trim() || '')
      : '';
    const currentUrl = page.url();

    if (hasSuccess) {
      console.log('>>> RESULT: Provider registration successful.');
      console.log('   Message:', successText);
      if (currentUrl.includes('/provider/login')) console.log('   Redirected to provider login.');
      await browser.close();
      process.exit(0);
    }

    if (currentUrl.includes('/provider/login') && !hasError) {
      console.log('>>> RESULT: Provider registration successful (redirected to provider login).');
      await browser.close();
      process.exit(0);
    }

    if (hasError) {
      console.log('>>> RESULT: Provider registration failed.');
      console.log('   Error:', errorText || '(no message)');
      await browser.close();
      process.exit(1);
    }

    console.log('>>> RESULT: Unknown state (no success or error banner).');
    console.log('   URL:', currentUrl);
    await browser.close();
    process.exit(1);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
