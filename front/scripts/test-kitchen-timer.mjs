#!/usr/bin/env node
/**
 * Puppeteer test: Kitchen/Bar display – timer and Timer settings button visible.
 * Logs in, opens /kitchen, checks for "Timer settings" button and (if orders exist) "Waiting" timer.
 *
 * Usage:
 *   LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-kitchen-timer.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:kitchen-timer --prefix front
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
    for (const port of [4202, 4203, 4200]) {
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

  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  const loginEmail = process.env.LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD;

  console.log('BASE_URL:', baseUrl);
  if (!loginEmail || !loginPassword) {
    console.error('LOGIN_EMAIL and LOGIN_PASSWORD are required.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 800 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    console.log('1. Logging in...');
    await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    await page.click('button[type="submit"]');
    await sleep(4000);
    if (page.url().includes('/login')) {
      console.error('FAIL: Login failed.');
      process.exit(1);
    }

    console.log('2. Opening /kitchen...');
    await page.goto(new URL('/kitchen', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    if (!page.url().includes('/kitchen')) {
      console.error('FAIL: Not on /kitchen.');
      process.exit(1);
    }

    await page.waitForSelector('.kitchen-view', { timeout: 10000 });
    console.log('3. Checking for Timer settings button...');
    const timerSettingsBtn = await page.$('.timer-settings-btn');
    if (!timerSettingsBtn) {
      console.error('FAIL: Timer settings button (.timer-settings-btn) not found.');
      const html = await page.evaluate(() => document.querySelector('.kitchen-header')?.innerHTML || 'no header');
      console.error('Header HTML (first 500 chars):', html.slice(0, 500));
      process.exit(1);
    }
    const btnText = await page.evaluate((el) => el.textContent || '', timerSettingsBtn);
    if (!btnText || (!btnText.includes('Timer') && !btnText.includes('timer') && !btnText.includes('Minuteur'))) {
      console.error('FAIL: Timer settings button text unexpected:', btnText);
      process.exit(1);
    }
    console.log('   Timer settings button found:', btnText.trim());

    console.log('4. Checking for order cards and Waiting timer...');
    const orderCards = await page.$$('.order-card');
    if (orderCards.length > 0) {
      const waitingCount = await page.$$eval('.order-waiting', (els) => els.length);
      if (waitingCount === 0) {
        console.error('FAIL: Found', orderCards.length, 'order card(s) but no .order-waiting element (timer).');
        const metaHtml = await page.evaluate(() => {
          const meta = document.querySelector('.order-meta');
          return meta ? meta.innerHTML : 'no order-meta';
        });
        console.error('First .order-meta innerHTML (first 400 chars):', metaHtml.slice(0, 400));
        process.exit(1);
      }
      console.log('   Found', waitingCount, 'Waiting timer(s) on order cards.');
    } else {
      console.log('   No order cards (empty state) – timer only appears on cards. OK.');
    }

    console.log('RESULT: Kitchen timer test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
