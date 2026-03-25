#!/usr/bin/env node
/**
 * Puppeteer: Floor plan — select a table, verify staff orders shortcut link (GitHub #75).
 * Expects canvas properties panel with link to /staff/orders?focusOrder=… or ?focusTableId=…
 *
 * Usage (from repo root):
 *   node front/scripts/test-tables-canvas-open-orders.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-tables-canvas-open-orders.mjs
 *
 * Env: same as test-tables-canvas-view-options (LOGIN_EMAIL/PASSWORD or DEMO_* from .env, TENANT_ID default 1).
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
      'Credentials required: LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env (tenant=1).'
    );
    process.exit(1);
  }
  const tenantId = process.env.TENANT_ID || process.env.LOGIN_TENANT_ID || '1';

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
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
      console.log('FAIL: Still on login (check credentials).');
      await browser.close();
      process.exit(1);
    }

    await page.goto(new URL('/tables/canvas', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    if (!page.url().includes('/tables/canvas')) {
      console.log('FAIL: Not on /tables/canvas.');
      await browser.close();
      process.exit(1);
    }
    await sleep(2000);

    const tableGroup = await page.$('svg.canvas-svg g.table-group');
    if (!tableGroup) {
      console.log('FAIL: No table on canvas (seed demo tables for tenant 1).');
      await browser.close();
      process.exit(1);
    }

    await tableGroup.click();
    await sleep(800);

    const ordersLink = await page.$(
      '[data-testid="canvas-table-orders-btn"], [data-testid="canvas-open-order-btn"]'
    );
    if (!ordersLink) {
      console.log(
        'FAIL: Staff orders shortcut not found (need order-capable role: owner/admin/waiter/…).'
      );
      await browser.close();
      process.exit(1);
    }

    const href = await page.evaluate((el) => el.getAttribute('href'), ordersLink);
    const ok =
      href &&
      href.includes('staff/orders') &&
      (href.includes('focusOrder=') || href.includes('focusTableId='));
    if (!ok) {
      console.log('FAIL: Unexpected orders link href:', href);
      await browser.close();
      process.exit(1);
    }

    await browser.close();
    console.log('OK: Canvas table selection exposes staff orders link:', href);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
