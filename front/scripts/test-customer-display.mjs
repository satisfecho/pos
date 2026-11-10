#!/usr/bin/env node
/**
 * Puppeteer smoke: customer-facing order display at /display/{tableToken} (#434).
 * Resolves Take Away table token via public menu / staff login + tables API,
 * opens display, asserts chrome + empty or order state, optional email field.
 *
 * Usage (from repo root):
 *   LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-customer-display.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:customer-display --prefix front
 *
 * Env: BASE_URL, LOGIN_EMAIL/LOGIN_PASSWORD (or DEMO_LOGIN_* / ADMIN_*), HEADLESS,
 *      PUPPETEER_EXECUTABLE_PATH, TABLE_TOKEN (optional skip discovery).
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

function loadDotEnv() {
  const envPath = join(repoRoot, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

loadDotEnv();

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function resolveChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return CHROME_CANDIDATES[0];
}

async function resolveBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  for (const port of [4202, 4203, 4200]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'head',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok || res.status < 500) return `http://127.0.0.1:${port}`;
    } catch (_) {}
  }
  return 'http://127.0.0.1:4202';
}

function isTakeAwayName(name) {
  const n = (name || '').trim().toLowerCase();
  return n === 'take away' || n === 'home ordering' || n === 'takeaway' || n === 'take-away';
}

async function main() {
  const baseUrl = await resolveBaseUrl();
  const headless = isHeadless();
  const loginEmail =
    process.env.LOGIN_EMAIL || process.env.ADMIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
  const loginPassword =
    process.env.LOGIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;
  const chromePath = resolveChrome();

  console.log('BASE_URL:', baseUrl);
  console.log('Chrome:', chromePath);

  let tableToken = (process.env.TABLE_TOKEN || '').trim();
  if (!tableToken && (!loginEmail || !loginPassword)) {
    console.error(
      'FAIL: Set TABLE_TOKEN, or LOGIN_EMAIL/LOGIN_PASSWORD (or DEMO_LOGIN_* / ADMIN_*) to discover a table.',
    );
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless,
    defaultViewport: headless ? { width: 1280, height: 800 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    if (!tableToken) {
      console.log('1. Logging in to discover Take Away token...');
      await page.goto(new URL('/login', baseUrl).href, {
        waitUntil: 'networkidle2',
        timeout: 20000,
      });
      await page.type('input[type="email"]', loginEmail);
      await page.type('input[type="password"]', loginPassword);
      await page.click('button[type="submit"]');
      await sleep(4000);
      if (page.url().includes('/login')) {
        console.error('FAIL: Login failed.');
        process.exit(1);
      }

      tableToken = await page.evaluate(async () => {
        const res = await fetch('/api/tables', { credentials: 'include' });
        if (!res.ok) return null;
        const tables = await res.json();
        const takeAway = (tables || []).find((t) => {
          const n = (t.name || '').trim().toLowerCase();
          return (
            n === 'take away' ||
            n === 'home ordering' ||
            n === 'takeaway' ||
            n === 'take-away'
          );
        });
        return takeAway?.token || tables?.[0]?.token || null;
      });

      if (!tableToken) {
        console.error('FAIL: No table token found via GET /api/tables.');
        process.exit(1);
      }
      console.log('   Table token:', tableToken.slice(0, 8) + '…');
    } else {
      console.log('1. Using TABLE_TOKEN from env');
    }

    console.log('2. Opening /display/{token}...');
    await page.goto(new URL(`/display/${tableToken}`, baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    await page.waitForSelector('[data-testid="customer-display"]', { timeout: 15000 });
    console.log('3. Customer display chrome OK');

    const state = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="customer-display"]');
      return {
        empty: !!document.querySelector('[data-testid="cd-empty"]'),
        order: !!document.querySelector('[data-testid="cd-order"]'),
        paid: !!document.querySelector('[data-testid="cd-paid"]'),
        error: !!document.querySelector('[data-testid="cd-error"]'),
        payOpts: !!document.querySelector('[data-testid="cd-payment-options"]'),
        email: !!document.querySelector('[data-testid="cd-email"]'),
        text: (root?.textContent || '').slice(0, 200),
      };
    });

    if (state.error) {
      console.error('FAIL: Display showed error state.', state.text);
      process.exit(1);
    }
    if (!state.empty && !state.order && !state.paid) {
      console.error('FAIL: Expected empty, order, or paid panel.', state);
      process.exit(1);
    }
    if (state.order && (!state.payOpts || !state.email)) {
      console.error('FAIL: Order view missing payment options or email capture.', state);
      process.exit(1);
    }
    console.log('   State:', {
      empty: state.empty,
      order: state.order,
      paid: state.paid,
      payOpts: state.payOpts,
      email: state.email,
    });

    if (pageErrors.length) {
      console.error('FAIL: page errors:', pageErrors);
      process.exit(1);
    }

    console.log('PASS: customer display smoke OK');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
