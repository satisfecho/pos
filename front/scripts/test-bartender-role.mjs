#!/usr/bin/env node
/**
 * Puppeteer test: bartender role — Users page shows Bartender in role dropdown.
 * Logs in as admin/owner, opens /users, clicks Add user, asserts the role select
 * includes an option with value "bartender".
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203/4202/4200 or satisfecho.de)
 *   LOGIN_EMAIL    Admin or owner user email (required)
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
    console.error('LOGIN_EMAIL and LOGIN_PASSWORD are required (use admin/owner credentials).');
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
      console.log('   FAIL: Still on login page (check credentials; need admin or owner).');
      await browser.close();
      process.exit(1);
    }
    console.log('   OK: Logged in');

    // 2. Open /users (admin/owner only)
    console.log('2. Opening /users...');
    await page.goto(new URL('/users', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);

    const url = page.url();
    if (!url.includes('/users')) {
      console.log('   FAIL: Not on users page (redirected; need admin or owner). URL:', url);
      await browser.close();
      process.exit(1);
    }
    console.log('   OK: On users page');

    // 3. Open "Add user" modal
    console.log('3. Opening Add user modal...');
    const addUserBtn = await page.$('button.btn-primary');
    if (!addUserBtn) {
      console.log('   FAIL: Add user button not found');
      await browser.close();
      process.exit(1);
    }
    await addUserBtn.click();
    await sleep(800);

    // 4. Assert role select has "bartender" option
    const hasBartenderOption = await page.evaluate(() => {
      const select = document.querySelector('select#role');
      if (!select) return false;
      const option = Array.from(select.querySelectorAll('option')).find((o) => o.value === 'bartender');
      return !!option;
    });
    if (!hasBartenderOption) {
      console.log('   FAIL: Role select has no option value "bartender"');
      await browser.close();
      process.exit(1);
    }
    console.log('   OK: Bartender role present in role dropdown');

    await browser.close();
    console.log('\n>>> RESULT: Bartender role test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
