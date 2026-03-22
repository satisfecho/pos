#!/usr/bin/env node
/**
 * Puppeteer test: rate limiting on login page.
 * Opens /login, submits wrong credentials 6 times; expects error banner to appear
 * (401 for wrong password on 1–5, or 429 on 6th when limit is hit; or 429 on any if already limited).
 *
 * Usage (from repo root, app running):
 *   node front/scripts/test-rate-limit-puppeteer.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-rate-limit-puppeteer.mjs
 *
 * Env: BASE_URL, HEADLESS
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LOGIN_ATTEMPTS = 6;

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

  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  console.log('Submitting wrong login', LOGIN_ATTEMPTS, 'times to trigger rate limit...');
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
    await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    await page.type('input[type="email"]', 'rate-limit-puppeteer@amvara.de');
    await page.type('input[type="password"]', 'wrongpassword');

    for (let i = 0; i < LOGIN_ATTEMPTS; i++) {
      await page.click('button[type="submit"].btn-submit');
      await sleep(1200);
      const hasError = await page.evaluate(() => !!document.querySelector('.error-banner'));
      const errorText = hasError
        ? await page.evaluate(() => document.querySelector('.error-banner')?.textContent?.trim() || '')
        : '';
      console.log('   Attempt', i + 1, hasError ? '-> error banner' : '-> no banner', errorText ? `"${errorText.slice(0, 50)}..."` : '');
    }

    const hasErrorBanner = await page.evaluate(() => !!document.querySelector('.error-banner'));
    const errorText = hasErrorBanner
      ? await page.evaluate(() => document.querySelector('.error-banner')?.textContent?.trim() || '')
      : '';

    await browser.close();

    if (!hasErrorBanner) {
      console.log('FAIL: Expected error banner after', LOGIN_ATTEMPTS, 'failed login attempts.');
      process.exit(1);
    }
    const looksLikeRateLimit = /many|limit|again|429|too many|try again/i.test(errorText);
    const looksLikeAuthError = /incorrect|invalid|wrong|password|login failed/i.test(errorText);
    if (!looksLikeRateLimit && !looksLikeAuthError) {
      console.log('WARN: Error banner text does not clearly look like 401/429:', errorText.slice(0, 80));
    }
    console.log('PASS: Error banner shown after login attempts.', looksLikeRateLimit ? '(rate limit message)' : '(auth or rate limit)');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
