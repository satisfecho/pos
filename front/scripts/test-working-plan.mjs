#!/usr/bin/env node
/**
 * Puppeteer smoke test: Working plan page (shift schedule).
 * Requires an owner or admin user (Working plan is admin-only).
 *
 * Usage (from repo root):
 *   npm run test:working-plan --prefix front
 *   LOGIN_EMAIL=owner@example.com LOGIN_PASSWORD=secret node front/scripts/test-working-plan.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:working-plan --prefix front
 *
 * Loads .env from repo root if LOGIN_EMAIL/LOGIN_PASSWORD are not set (uses DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD).
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200 or http://satisfecho.de)
 *   LOGIN_EMAIL    Owner/admin email (or set DEMO_LOGIN_EMAIL in .env)
 *   LOGIN_PASSWORD Password (or set DEMO_LOGIN_PASSWORD in .env)
 *   TENANT_ID      Tenant for login URL (default 1); use so login uses /login?tenant=1 and user is Owner
 *   HEADLESS       Set to 1 to run headless
 *
 * Note: The working-plan route is lazy-loaded. If you don't see UI changes after editing the component,
 * do a full page refresh (Ctrl+Shift+R / Cmd+Shift+R) or restart the dev server; hot reload often
 * does not invalidate lazy-loaded chunks.
 */

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
  const loginEmail =
    process.env.LOGIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.DEMO_LOGIN_EMAIL;
  const loginPassword =
    process.env.LOGIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    process.env.DEMO_LOGIN_PASSWORD;

  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  if (!loginEmail || !loginPassword) {
    console.error(
      'Credentials required: set LOGIN_EMAIL/LOGIN_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env. User must be owner or admin.'
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
  page.on('console', (msg) => console.log('[browser]', msg.text()));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const tenantId = process.env.TENANT_ID || process.env.LOGIN_TENANT_ID || '1';

  try {
    console.log('1. Logging in (tenant=' + tenantId + ')...');
    await page.goto(new URL('/login?tenant=' + tenantId, baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
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

    // Wait for user to be loaded (sidebar shows role e.g. "Owner") so admin links are visible
    console.log('2. Waiting for user to load (sidebar shows role)...');
    await page.waitForSelector('.user-role', { timeout: 15000 }).catch(() => null);
    await sleep(800); // allow sidebar/admin section to re-render with role

    // Click Users so the user role is visible (e.g. Owner) before continuing
    console.log('   Opening Users page (to show user role)...');
    const usersLink = await page.$('a[href="/users"]');
    if (usersLink) {
      await usersLink.click();
      await sleep(2500); // let Users page load and display role
    }

    // Click Working plan: sidebar or dashboard link (Angular RouterLink sets href)
    const wpLink = await page.$('a[href="/working-plan"]');
    if (wpLink) {
      console.log('   Clicking Working plan link...');
      await wpLink.click();
      await sleep(2000);
    } else {
      console.log('   Working plan link not found; navigating directly...');
      await page.goto(new URL('/working-plan', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    }
    const workingPlanUrl = page.url();
    if (!workingPlanUrl.includes('/working-plan')) {
      console.log('   FAIL: Not on /working-plan (redirected to', workingPlanUrl, '- user may lack schedule:read).');
      await browser.close();
      process.exit(1);
    }

    console.log('3. Waiting for Working plan page content...');
    await page.waitForSelector('[data-testid="working-plan-page"]', { timeout: 10000 });
    const addShiftBtn = await page.$('[data-testid="working-plan-add-shift"]');
    if (!addShiftBtn) {
      console.log('   FAIL: Working plan page loaded but Add shift button (data-testid="working-plan-add-shift") not found.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Working plan page loaded; Add shift button present.');

    console.log('4. Checking week navigation...');
    const hasWeekNav = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="working-plan-page"]');
      if (!root) return false;
      const weekLabel = root.querySelector('.week-label');
      const prevNext = root.querySelectorAll('button');
      return !!weekLabel && prevNext.length >= 2;
    });
    if (!hasWeekNav) {
      console.log('   WARN: Week navigation (prev/next or label) not found; page may still be valid.');
    } else {
      console.log('   Week navigation present.');
    }

    console.log('5. Switching to Calendar view...');
    const calendarBtn = await page.$('[data-testid="working-plan-view-calendar"]');
    if (!calendarBtn) {
      console.log('   FAIL: Calendar view button (data-testid="working-plan-view-calendar") not found.');
      console.log('   Tip: Working-plan is lazy-loaded. Do a hard refresh (Cmd+Shift+R) or restart the dev server, then run this test again.');
      await browser.close();
      process.exit(1);
    }
    await calendarBtn.click();
    await sleep(3000); // allow month schedule to load

    console.log('6. Checking calendar grid...');
    const calendarGrid = await page.waitForSelector('[data-testid="working-plan-calendar-grid"]', { timeout: 10000 }).catch(() => null);
    if (!calendarGrid) {
      console.log('   FAIL: Calendar grid (data-testid="working-plan-calendar-grid") not found after switching to Calendar view.');
      await browser.close();
      process.exit(1);
    }
    const hasCalendarStructure = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="working-plan-calendar-grid"]');
      if (!grid) return false;
      const header = grid.querySelector('.calendar-header');
      const rows = grid.querySelectorAll('.calendar-row:not(.calendar-header)');
      const cells = grid.querySelectorAll('.calendar-cell');
      return !!header && rows.length >= 4 && cells.length >= 28; // at least 4 weeks * 7 days + header row
    });
    if (!hasCalendarStructure) {
      console.log('   FAIL: Calendar grid missing header or day rows.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Calendar view visible; grid has header and day cells.');

    const redDayCount = await page.evaluate(() =>
      document.querySelectorAll('.calendar-day-matches').length
    );
    console.log('   Days meeting requirements (red):', redDayCount);

    await browser.close();
    console.log('\n>>> RESULT: Working plan smoke test passed (week + calendar view).');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
