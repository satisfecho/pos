#!/usr/bin/env node
/**
 * Puppeteer test: /users "Add Satisfecho support" pre-fills support@satisfecho.de as admin.
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203/4202/4200)
 *   LOGIN_EMAIL    Admin or owner user email (required)
 *   LOGIN_PASSWORD Password
 *   HEADLESS       Default headless; set 0 for visible browser.
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const SUPPORT_EMAIL = 'support@satisfecho.de';

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

  const headless = isHeadless();
  const loginEmail = process.env.LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD;

  if (!loginEmail || !loginPassword) {
    console.error('LOGIN_EMAIL and LOGIN_PASSWORD are required (admin or owner).');
    process.exit(1);
  }

  console.log('BASE_URL:', baseUrl);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(3000);
    }
    if (page.url().includes('/login')) {
      console.log('FAIL: login failed');
      await browser.close();
      process.exit(1);
    }

    await page.goto(new URL('/users', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);
    if (!page.url().includes('/users')) {
      console.log('FAIL: not on /users');
      await browser.close();
      process.exit(1);
    }

    const supportBtn = await page.waitForSelector('[data-testid="add-support-access"]', {
      timeout: 8000,
    });
    if (!supportBtn) {
      console.log('FAIL: support access button not found');
      await browser.close();
      process.exit(1);
    }
    await supportBtn.click();
    await sleep(800);

    const formValues = await page.evaluate((expectedEmail) => {
      const email = document.querySelector('input#email');
      const role = document.querySelector('select#role');
      return {
        email: email?.value ?? '',
        role: role?.value ?? '',
        emailOk: (email?.value ?? '').toLowerCase() === expectedEmail,
        roleOk: role?.value === 'admin',
      };
    }, SUPPORT_EMAIL);

    if (!formValues.emailOk || !formValues.roleOk) {
      console.log('FAIL: form not pre-filled', formValues);
      await browser.close();
      process.exit(1);
    }

    console.log('OK: support modal pre-fills', SUPPORT_EMAIL, 'as admin');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
