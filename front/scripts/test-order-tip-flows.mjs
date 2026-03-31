#!/usr/bin/env node
/**
 * Puppeteer smoke: Settings → Payment → tip entry mode (preset/overpayment) and Reports tips summary.
 * Does not mark real orders paid; verifies UI surfaces for GitHub #123 tip flows.
 *
 * Usage (from repo root):
 *   npm run test:order-tip-flows --prefix front
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:order-tip-flows --prefix front
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200)
 *   LOGIN_EMAIL / LOGIN_PASSWORD  or DEMO_LOGIN_* from .env (owner/admin)
 *   TENANT_ID      Login tenant query param (default 1)
 *   HEADLESS       Default headless; set 0 to watch
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const repoRoot = resolve(__dirname, '..', '..');

function loadEnv() {
  const envPath = join(repoRoot, '.env');
  if (existsSync(envPath)) {
    try {
      readFileSync(envPath, 'utf8')
        .split('\n')
        .forEach((line) => {
          const m = line.match(/^([^#=]+)=(.*)$/);
          if (m && !process.env[m[1].trim()]) {
            process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
          }
        });
    } catch (_) {}
  }
}
loadEnv();

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
    baseUrl = baseUrl || 'http://localhost:4202';
  }

  const headless = isHeadless();
  const loginEmail =
    process.env.LOGIN_EMAIL || process.env.ADMIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
  const loginPassword =
    process.env.LOGIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;
  const tenantId = process.env.TENANT_ID || process.env.LOGIN_TENANT_ID || '1';

  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  if (!loginEmail || !loginPassword) {
    console.error(
      'Credentials required: LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env'
    );
    process.exit(1);
  }
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[browser]', msg.text()));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    console.log('1. Login...');
    await page.goto(new URL('/login?tenant=' + tenantId, baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await sleep(4000);
    if (page.url().includes('/login')) {
      console.log('   FAIL: login');
      await browser.close();
      process.exit(1);
    }
    console.log('   OK');

    console.log('2. Settings → Payments → tip_entry_mode...');
    await page.goto(new URL('/settings', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    const payTab = await page.$('[data-testid="settings-payments-tab"]');
    if (!payTab) {
      console.log('   FAIL: settings-payments-tab missing');
      await browser.close();
      process.exit(1);
    }
    await payTab.click();
    await sleep(1500);
    await page.waitForSelector('#tip_entry_mode', { timeout: 10000 });
    const before = await page.$eval('#tip_entry_mode', (el) => el.value);
    await page.select('#tip_entry_mode', 'overpayment');
    await page.click('.settings-form .form-actions button[type="submit"]');
    await sleep(3000);
    const err = await page.$('.toast.error');
    if (err) {
      const t = await page.evaluate((e) => e.textContent || '', err);
      console.log('   FAIL: save error', t);
      await browser.close();
      process.exit(1);
    }
    await page.select('#tip_entry_mode', before || 'preset');
    await page.click('.settings-form .form-actions button[type="submit"]');
    await sleep(2500);
    const err2 = await page.$('.toast.error');
    if (err2) {
      const t = await page.evaluate((e) => e.textContent || '', err2);
      console.log('   FAIL: restore preset', t);
      await browser.close();
      process.exit(1);
    }
    console.log('   OK (toggled overpayment, saved, restored)');

    console.log('3. Reports → tips summary card...');
    await page.goto(new URL('/reports', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    if (!page.url().includes('/reports')) {
      console.log('   FAIL: not on /reports (need report:read)');
      await browser.close();
      process.exit(1);
    }
    await page.waitForSelector('[data-testid="reports-page"]', { timeout: 12000 });
    await page.waitForSelector('[data-testid="reports-summary-tips"]', { timeout: 15000 });
    const tipsText = await page.$eval(
      '[data-testid="reports-summary-tips"] .card-value',
      (el) => (el.textContent || '').trim()
    );
    if (!tipsText) {
      console.log('   FAIL: tips card value empty');
      await browser.close();
      process.exit(1);
    }
    console.log('   OK (tips card:', tipsText + ')');

    await browser.close();
    console.log('\n>>> RESULT: order tip flows smoke passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
