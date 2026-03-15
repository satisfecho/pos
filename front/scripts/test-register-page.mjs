#!/usr/bin/env node
/**
 * Puppeteer test: register page shows the "Who is this for?" explanation
 * (for providers vs guests) so end users are not confused.
 *
 * Usage (from repo root):
 *   node front/scripts/test-register-page.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-register-page.mjs
 *
 * Env:
 *   BASE_URL   App URL (default: auto-detect 4203, 4202, 4200 or http://satisfecho.de)
 *   HEADLESS  Set to 1 to run headless (default: 0)
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

  try {
    // Prefer English so we can assert on known strings
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });

    console.log('1. Loading /register...');
    await page.goto(new URL('/register', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });

    const url = page.url();
    if (!url.includes('/register')) {
      console.log('   FAIL: Not on register page (redirected to', url, ')');
      await browser.close();
      process.exit(1);
    }
    console.log('   On register page.');

    console.log('2. Waiting for register form...');
    await page.waitForSelector('app-register', { timeout: 10000 });
    await page.waitForSelector('app-register input#tenant', { timeout: 15000 });

    // Prefer structured .register-explanation; fall back to app-register body text (content-based)
    const explanation = await page.evaluate(() => {
      const app = document.querySelector('app-register');
      if (!app) return { found: false, byClass: false, title: '', providers: '', guests: '', body: '' };
      const el = app.querySelector('.register-explanation');
      const body = (app.textContent || '').trim();
      if (el) {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const visible = style.display !== 'none' && rect.width > 0 && rect.height > 0;
        const titleEl = el.querySelector('.register-explanation-title');
        const providersEl = el.querySelector('.register-explanation-providers');
        const guestsEl = el.querySelector('.register-explanation-guests');
        return {
          found: visible,
          byClass: true,
          title: (titleEl && titleEl.textContent || '').trim(),
          providers: (providersEl && providersEl.textContent || '').trim(),
          guests: (guestsEl && guestsEl.textContent || '').trim(),
          body,
        };
      }
      return { found: body.length > 0, byClass: false, title: '', providers: '', guests: '', body };
    });

    await browser.close();

    const title = explanation.title || explanation.body;
    const providers = explanation.providers || explanation.body;
    const guests = explanation.guests || explanation.body;

    if (!explanation.found && !explanation.body) {
      console.log('   FAIL: Register page has no visible content.');
      process.exit(1);
    }

    // Assert expected explanation content (EN or other locales)
    const hasWho = /who is this for|für wen|para quién|per a qui|这是给谁|questo per/i.test(title);
    const hasProviderContext = /restaurant|business|owner|dashboard|staff|negoci|geschäft|restaurante|ristorante/i.test(providers);
    const hasGuestHint = /book a table|table code|don't need|do not need|homepage|reservar|tisch|taula|mesa|无需|need an account/i.test(guests);

    console.log('   Explanation block:', explanation.byClass ? 'by class' : 'by page content');
    console.log('   Title match:', hasWho ? 'OK' : 'missing');
    console.log('   Provider context:', hasProviderContext ? 'OK' : 'missing');
    console.log('   Guest hint:', hasGuestHint ? 'OK' : 'missing');

    if (!hasWho) {
      console.log('   FAIL: Page should show "Who is this for?" (or equivalent) explanation title.');
      process.exit(1);
    }
    if (!hasProviderContext) {
      console.log('   FAIL: Provider text should mention restaurant/business/dashboard.');
      process.exit(1);
    }
    if (!hasGuestHint) {
      console.log('   FAIL: Guest hint should mention booking table or table code or not needing account.');
      process.exit(1);
    }

    console.log('\n>>> RESULT: Register page shows provider/guest explanation.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
