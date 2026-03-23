#!/usr/bin/env node
/**
 * Puppeteer: waiter on Tables — no assignment dropdowns; read-only labels from API.
 * Regression guard for GitHub #65 (empty waiter <select> without user:read).
 *
 * Requires a tenant staff user with role waiter (no table:write).
 * Env (or .env in repo root):
 *   BASE_URL              App URL (default: auto-detect 4203/4202/4200)
 *   WAITER_LOGIN_EMAIL    Waiter user email
 *   WAITER_LOGIN_PASSWORD Password
 *   TENANT_ID             Login tenant (default: 1)
 *   HEADLESS              Default headless
 *
 * If WAITER_* are unset, exits 0 with a skip message (optional local/QA check).
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = val;
      }
    }
  }
}

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  const waiterEmail = process.env.WAITER_LOGIN_EMAIL;
  const waiterPassword = process.env.WAITER_LOGIN_PASSWORD;
  if (!waiterEmail || !waiterPassword) {
    console.log('SKIP: set WAITER_LOGIN_EMAIL and WAITER_LOGIN_PASSWORD to run waiter tables assignment test.');
    process.exit(0);
  }

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

  const headless = isHeadless();
  const tenantId = process.env.TENANT_ID != null ? process.env.TENANT_ID : '1';

  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  console.log('Tenant:', tenantId);
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
    console.log('1. Logging in as waiter...');
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('tenant', tenantId);
    await page.goto(loginUrl.href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', waiterEmail);
    await page.type('input[type="password"]', waiterPassword);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(3000);
    }
    if (page.url().includes('/login')) {
      console.log('   FAIL: Still on login (check WAITER_* credentials and tenant).');
      await browser.close();
      process.exit(1);
    }
    console.log('   OK: Logged in');

    console.log('2. Opening /tables (Table view if toggle present)...');
    await page.goto(new URL('/tables', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);

    const viewToggle = await page.$('.view-toggle');
    if (viewToggle) {
      const tableViewButton = await page.$('.view-toggle button:nth-child(2)');
      if (tableViewButton) {
        await tableViewButton.click();
        await sleep(600);
      }
    }

    const probe = await page.evaluate(() => {
      const table = document.querySelector('.tables-data-table');
      if (!table) {
        return { ok: false, reason: 'no-data-table' };
      }
      const selects = table.querySelectorAll('select.waiter-select-inline');
      const rows = table.querySelectorAll('tbody tr');
      const readonlyCells = table.querySelectorAll('.waiter-readonly-inline');
      return {
        ok: true,
        selectCount: selects.length,
        rowCount: rows.length,
        readonlyCount: readonlyCells.length,
      };
    });

    if (!probe.ok) {
      console.log('   FAIL: .tables-data-table not found (waiter may lack table access or page empty).');
      await browser.close();
      process.exit(1);
    }

    if (probe.selectCount > 0) {
      console.log(
        `   FAIL: Waiter must not see assignment dropdowns; found ${probe.selectCount} select.waiter-select-inline`
      );
      await browser.close();
      process.exit(1);
    }

    if (probe.rowCount > 0 && probe.readonlyCount !== probe.rowCount) {
      console.log(
        `   FAIL: Expected one .waiter-readonly-inline per data row; rows=${probe.rowCount} readonly=${probe.readonlyCount}`
      );
      await browser.close();
      process.exit(1);
    }

    console.log(
      `   OK: Table view — ${probe.rowCount} rows, ${probe.readonlyCount} read-only waiter cells, 0 assignment selects`
    );

    await browser.close();
    console.log('\n>>> RESULT: Waiter tables assignment visibility test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
