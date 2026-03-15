#!/usr/bin/env node
/**
 * Puppeteer smoke test: Reports page (Sales & Revenue).
 * Requires an owner or admin user (Reports is admin-only).
 *
 * Usage (from repo root):
 *   LOGIN_EMAIL=owner@example.com LOGIN_PASSWORD=secret node front/scripts/test-reports.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:reports --prefix front
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200 or http://satisfecho.de)
 *   LOGIN_EMAIL    Owner/admin email (required)
 *   LOGIN_PASSWORD Password
 *   HEADLESS       Set to 1 to run headless
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

  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  if (!loginEmail || !loginPassword) {
    console.error('LOGIN_EMAIL and LOGIN_PASSWORD are required (use an owner or admin user).');
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
    console.log('1. Logging in...');
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
      console.log('   FAIL: Still on login page (check credentials; user must be owner or admin).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in, URL:', afterLogin);

    console.log('2. Opening /reports...');
    await page.goto(new URL('/reports', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    const reportsUrl = page.url();
    if (!reportsUrl.includes('/reports')) {
      console.log('   FAIL: Not on /reports (redirected to', reportsUrl, '- user may lack report:read).');
      await browser.close();
      process.exit(1);
    }

    console.log('3. Waiting for Reports page content...');
    await page.waitForSelector('[data-testid="reports-page"]', { timeout: 10000 });
    const hasDateInputs = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="reports-page"]');
      return root && root.querySelectorAll('input[type="date"]').length >= 2;
    });
    if (!hasDateInputs) {
      console.log('   FAIL: Reports page loaded but date range inputs not found.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Reports page loaded; date range present.');

    await browser.close();
    console.log('\n>>> RESULT: Reports smoke test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
