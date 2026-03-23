#!/usr/bin/env node
/**
 * Puppeteer test: Tables – switch between all three views (Floor plan, Tiles, Table).
 * From canvas: verifies view options stay visible after "Añadir mesa"; then switches to
 * Tiles view, then Table view, then back to Floor plan (canvas), then to Table list again.
 * Uses demo user from .env, tenant=1.
 *
 * Usage (from repo root):
 *   node front/scripts/test-tables-canvas-view-options.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-tables-canvas-view-options.mjs
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200)
 *   LOGIN_EMAIL    Override (or DEMO_LOGIN_EMAIL from .env)
 *   LOGIN_PASSWORD Override (or DEMO_LOGIN_PASSWORD from .env)
 *   TENANT_ID      Tenant for login (default 1). Demo tables must be seeded for tenant 1.
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
      'Credentials required: set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env (tenant=1).'
    );
    process.exit(1);
  }
  const tenantId = process.env.TENANT_ID || process.env.LOGIN_TENANT_ID || '1';
  console.log('Login as:', loginEmail, '(tenant=' + tenantId + ')');
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
    if (page.url().includes('/login')) {
      console.log('   FAIL: Still on login page (check credentials and tenant).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in.');

    console.log('2. Opening /tables/canvas...');
    await page.goto(new URL('/tables/canvas', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    if (!page.url().includes('/tables/canvas')) {
      console.log('   FAIL: Not on /tables/canvas.');
      await browser.close();
      process.exit(1);
    }
    await sleep(2000);

    const header = await page.$('[data-testid="tables-canvas-header"]');
    if (!header) {
      console.log('   FAIL: Canvas header not found.');
      await browser.close();
      process.exit(1);
    }

    const floorPlan = await page.$('[data-testid="view-option-floor-plan"]');
    const viewTiles = await page.$('[data-testid="view-option-tiles"]');
    const viewTable = await page.$('[data-testid="view-option-table"]');
    if (!floorPlan || !viewTiles || !viewTable) {
      console.log(
        '   FAIL: One or more view options missing (need at least one floor for tenant 1). Floor plan:',
        !!floorPlan,
        'Tiles:',
        !!viewTiles,
        'Table:',
        !!viewTable
      );
      await browser.close();
      process.exit(1);
    }
    console.log('   Three view options visible (Floor plan, Tiles, Table).');

    const addTableBtn = await page.$('[data-testid="tables-canvas-add-table-btn"]');
    if (!addTableBtn) {
      console.log('   FAIL: Add table button not found (no floors? seed demo tables for tenant 1).');
      await browser.close();
      process.exit(1);
    }
    console.log('3. Clicking Add table ("Añadir mesa")...');
    await addTableBtn.click();
    await sleep(1500);

    const floorPlanAfter = await page.$('[data-testid="view-option-floor-plan"]');
    const viewTilesAfter = await page.$('[data-testid="view-option-tiles"]');
    const viewTableAfter = await page.$('[data-testid="view-option-table"]');
    const inViewport = (el) =>
      page.evaluate((e) => {
        if (!e) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
      }, el);
    const visibleAfter = await Promise.all([
      floorPlanAfter ? inViewport(floorPlanAfter) : false,
      viewTilesAfter ? inViewport(viewTilesAfter) : false,
      viewTableAfter ? inViewport(viewTableAfter) : false,
    ]).catch(() => [false, false, false]);

    const allPresent = floorPlanAfter && viewTilesAfter && viewTableAfter;
    const allVisible = visibleAfter.every(Boolean);
    if (!allPresent) {
      console.log(
        '   FAIL: View options disappeared from DOM after clicking Add table. Floor plan:',
        !!floorPlanAfter,
        'Tiles:',
        !!viewTilesAfter,
        'Table:',
        !!viewTableAfter
      );
      await browser.close();
      process.exit(1);
    }
    if (!allVisible) {
      console.log(
        '   FAIL: View options not visible after clicking Add table (e.g. scrolled off). Visible:',
        visibleAfter
      );
      await browser.close();
      process.exit(1);
    }
    console.log('   Three view options still visible after Add table.');

    console.log('4. Switching to Tiles view (click Tiles link)...');
    await viewTilesAfter.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await sleep(1500);
    if (!page.url().includes('/tables') || page.url().includes('/tables/canvas')) {
      console.log('   FAIL: Not on /tables after clicking Tiles link.');
      await browser.close();
      process.exit(1);
    }
    const tilesBtn = await page.$('[data-testid="view-mode-tiles"]');
    if (tilesBtn) await tilesBtn.click();
    await sleep(800);
    const tilesContent = await page.$('.table-grid');
    if (!tilesContent) {
      console.log('   FAIL: Tiles view content (.table-grid) not found.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Tiles view visible.');

    console.log('5. Switching to Table view (click Table button)...');
    const tableModeBtn = await page.$('[data-testid="view-mode-table"]');
    if (!tableModeBtn) {
      console.log('   FAIL: Table view button (view-mode-table) not found.');
      await browser.close();
      process.exit(1);
    }
    await tableModeBtn.click();
    await sleep(1000);
    const tableDataTable = await page.$('.tables-data-table');
    if (!tableDataTable) {
      console.log('   FAIL: Table view (.tables-data-table) not found.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Table view visible.');

    console.log('6. Switching back to Floor plan (canvas)...');
    const floorPlanLink = await page.$('[data-testid="tables-floor-plan-link"]');
    if (!floorPlanLink) {
      console.log('   FAIL: Floor plan link not found on /tables.');
      await browser.close();
      process.exit(1);
    }
    await floorPlanLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await sleep(1500);
    const canvasHeaderAgain = await page.$('[data-testid="tables-canvas-header"]');
    if (!canvasHeaderAgain || !page.url().includes('/tables/canvas')) {
      console.log('   FAIL: Not on /tables/canvas after clicking Floor plan link.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Floor plan (canvas) visible.');

    console.log('7. Switching to Table list again (click Table link from canvas)...');
    const viewTableLink = await page.$('[data-testid="view-option-table"]');
    if (!viewTableLink) {
      console.log('   FAIL: View option Table link not found on canvas.');
      await browser.close();
      process.exit(1);
    }
    await viewTableLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await sleep(1000);
    if (!page.url().includes('/tables')) {
      console.log('   FAIL: Not on /tables after clicking Table link from canvas.');
      await browser.close();
      process.exit(1);
    }
    const tableViewAgain = await page.$('.tables-data-table');
    if (!tableViewAgain) {
      console.log('   FAIL: Table view not shown after switching from canvas (view may have reset to tiles).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Table list view visible again.');

    await browser.close();
    console.log('\n>>> RESULT: Tables canvas view-options test passed (Floor plan → Tiles → Table → Floor plan → Table).');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
