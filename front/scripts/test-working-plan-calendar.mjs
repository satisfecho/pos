#!/usr/bin/env node
/**
 * Puppeteer smoke test: Working plan calendar view at /working-plan/calendar.
 * Logs in using .env (tenant=1), opens the calendar URL directly, and fails on console errors.
 *
 * Usage (from repo root):
 *   npm run test:working-plan-calendar --prefix front
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:working-plan-calendar --prefix front
 *
 * Loads .env from repo root for LOGIN_EMAIL/LOGIN_PASSWORD (or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD).
 * TENANT_ID=1 by default so login uses /login?tenant=1.
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200)
 *   LOGIN_EMAIL    Staff email (or DEMO_LOGIN_EMAIL in .env)
 *   LOGIN_PASSWORD Password (or DEMO_LOGIN_PASSWORD in .env)
 *   TENANT_ID      Tenant for login (default 1)
 *   HEADLESS       Default headless; set 0, false, or no for a visible browser.
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
      readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
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
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4202';
  const headless = isHeadless();
  const loginEmail =
    process.env.LOGIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.DEMO_LOGIN_EMAIL;
  const loginPassword =
    process.env.LOGIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    process.env.DEMO_LOGIN_PASSWORD;
  const tenantId = process.env.TENANT_ID || process.env.LOGIN_TENANT_ID || '1';

  console.log('BASE_URL:', baseUrl);
  console.log('Tenant:', tenantId);
  console.log('Headless:', headless);
  if (!loginEmail || !loginPassword) {
    console.error(
      'Credentials required: set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env (tenant=1).'
    );
    process.exit(1);
  }
  console.log('Login as:', loginEmail);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Console messages to detect runtime errors (e.g. NG04014). */
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') consoleErrors.push(text);
    else if (type === 'warning') consoleWarnings.push(text);
  });

  try {
    console.log('1. Logging in (tenant=' + tenantId + ')...');
    await page.goto(new URL('/login?tenant=' + tenantId, baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(4000);
    }
    const afterLogin = page.url();
    if (afterLogin.includes('/login')) {
      console.error('FAIL: Still on login page. Check credentials in .env for tenant=1.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in.');

    console.log('2. Navigating to /working-plan/calendar...');
    await page.goto(new URL('/working-plan/calendar', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    const calendarUrl = page.url();
    if (!calendarUrl.includes('/working-plan/calendar')) {
      console.error('FAIL: Not on calendar (got ' + calendarUrl + '). User may lack schedule access.');
      await browser.close();
      process.exit(1);
    }

    await sleep(3000); // allow schedule + tenant settings to load

    if (consoleErrors.length > 0) {
      console.error('FAIL: Console errors on /working-plan/calendar:');
      consoleErrors.forEach((e) => console.error('  ', e));
      await browser.close();
      process.exit(1);
    }

    console.log('3. Checking calendar page...');
    const pageEl = await page.$('[data-testid="working-plan-page"]');
    if (!pageEl) {
      console.error('FAIL: working-plan page root not found.');
      await browser.close();
      process.exit(1);
    }
    const grid = await page.$('[data-testid="working-plan-calendar-grid"]');
    if (!grid) {
      console.error('FAIL: working-plan-calendar-grid not found.');
      await browser.close();
      process.exit(1);
    }
    const hasStructure = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="working-plan-calendar-grid"]');
      if (!grid) return false;
      const header = grid.querySelector('.calendar-header');
      const rows = grid.querySelectorAll('.calendar-row:not(.calendar-header)');
      const cells = grid.querySelectorAll('.calendar-cell');
      return !!header && rows.length >= 4 && cells.length >= 28;
    });
    if (!hasStructure) {
      console.error('FAIL: Calendar grid missing header or day rows.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Calendar grid visible with header and day cells.');

    if (consoleWarnings.length > 0) {
      console.log('   Console warnings:', consoleWarnings.length);
    }

    await browser.close();
    console.log('\n>>> RESULT: /working-plan/calendar smoke test passed (no console errors).');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
    }
    await browser.close();
    process.exit(1);
  }
}

main();
