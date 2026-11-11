#!/usr/bin/env node
/**
 * Capture screenshots for docs (README and feature docs).
 * Logs in as staff (and optionally as provider/courier/platform), navigates to each page,
 * saves PNG to docs/screenshots/.
 *
 * Usage (from repo root):
 *   LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/capture-screenshots.mjs
 *   BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=... LOGIN_PASSWORD=... npm run capture-screenshots --prefix front
 *
 * Env:
 *   BASE_URL                     App URL (default: http://127.0.0.1:4202, then auto-detect 4203, 4202, 4200)
 *   LOGIN_EMAIL                  Staff (owner/admin) email — required for orders, kitchen, reports, reservations, tables, menu
 *   LOGIN_PASSWORD               Staff password
 *   TENANT_ID                    Public delivery / waitlist tenant (default 1)
 *   PROVIDER_TEST_EMAIL          Optional: provider login for provider dashboard screenshot
 *   PROVIDER_TEST_PASSWORD
 *   COURIER_EMAIL / COURIER_TEST_EMAIL         Optional: courier portal home screenshot
 *   COURIER_PASSWORD / COURIER_TEST_PASSWORD
 *   PLATFORM_OPERATOR_EMAIL      Optional: platform operator dashboard
 *   PLATFORM_OPERATOR_PASSWORD
 *   HEADLESS                     Default headless; set 0, false, or no for a visible browser.
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const outDir = join(repoRoot, 'docs', 'screenshots');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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

const VIEWPORT = { width: 1280, height: 900 };

async function detectBaseUrl() {
  let baseUrl = process.env.BASE_URL;
  if (baseUrl) return baseUrl.replace(/\/$/, '');
  for (const port of [4202, 4203, 4200]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'head',
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok || res.status < 500) {
        return `http://127.0.0.1:${port}`;
      }
    } catch (_) {}
  }
  return 'http://127.0.0.1:4202';
}

async function staffLogin(page, baseUrl, loginEmail, loginPassword) {
  await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.setViewport(VIEWPORT);
  await page.type('input[type="email"]', loginEmail);
  await page.type('input[type="password"]', loginPassword);
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();
  await new Promise((r) => setTimeout(r, 4000));
  if (page.url().includes('/login')) {
    throw new Error('Staff login failed (still on /login). Check LOGIN_EMAIL and LOGIN_PASSWORD.');
  }
}

async function getTableToken(baseUrl, loginEmail, loginPassword) {
  const apiBase = baseUrl.replace(/\/$/, '') + '/api';
  const loginRes = await fetch(`${apiBase}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: loginEmail, password: loginPassword }),
  });
  if (!loginRes.ok) return null;
  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(',')[0].trim() : '';
  const tablesRes = await fetch(`${apiBase}/tables/with-status`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  if (!tablesRes.ok) return null;
  const tables = await tablesRes.json();
  const first = tables && tables[0];
  return first?.token || null;
}

async function capture(page, baseUrl, path, file, options = {}) {
  const url = new URL(path, baseUrl).href;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.setViewport(VIEWPORT);
  const waitSelector = options.waitSelector;
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 10000 }).catch(() => {});
  }
  await new Promise((r) => setTimeout(r, options.delayMs || 800));
  const filePath = join(outDir, file);
  await page.screenshot({ path: filePath, fullPage: !!options.fullPage });
  console.log('  saved:', file);
}

async function main() {
  const baseUrl = await detectBaseUrl();
  const loginEmail = process.env.LOGIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;
  const tenantId = process.env.TENANT_ID || '1';
  const providerEmail = process.env.PROVIDER_TEST_EMAIL;
  const providerPassword = process.env.PROVIDER_TEST_PASSWORD;
  const courierEmail = process.env.COURIER_EMAIL || process.env.COURIER_TEST_EMAIL;
  const courierPassword = process.env.COURIER_PASSWORD || process.env.COURIER_TEST_PASSWORD;
  const platformEmail = process.env.PLATFORM_OPERATOR_EMAIL;
  const platformPassword = process.env.PLATFORM_OPERATOR_PASSWORD;
  const headless = isHeadless();

  console.log('BASE_URL:', baseUrl);
  console.log('TENANT_ID:', tenantId);
  console.log('Output dir:', outDir);
  if (!loginEmail || !loginPassword) {
    console.error('LOGIN_EMAIL and LOGIN_PASSWORD are required (owner/admin for dashboard, reports, etc.).');
    process.exit(1);
  }

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
    console.log('Created', outDir);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: VIEWPORT,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    await staffLogin(page, baseUrl, loginEmail, loginPassword);

    console.log('\nCapturing staff screenshots...');
    // Staff /dashboard screenshot intentionally omitted (sensitive demo data; #441).
    await capture(page, baseUrl, '/staff/orders', 'orders.png', {
      waitSelector: '.orders-page, [data-testid="orders-page"], app-orders, main',
      delayMs: 1000,
    });
    await capture(page, baseUrl, '/kitchen', 'kitchen.png', {
      waitSelector: '.kitchen-display, [data-testid="kitchen-display"], main',
      delayMs: 1000,
    });
    await capture(page, baseUrl, '/reports', 'reports.png', {
      waitSelector: '[data-testid="reports-page"]',
      delayMs: 1500,
    });
    await capture(page, baseUrl, '/reservations', 'reservations.png', {
      waitSelector: '.reservations, app-reservations, main',
      delayMs: 1000,
    });
    await capture(page, baseUrl, '/tables', 'tables.png', {
      waitSelector: '.tables-canvas, app-tables, main',
      delayMs: 1000,
    });

    const tableToken = await getTableToken(baseUrl, loginEmail, loginPassword);
    if (tableToken) {
      console.log('\nCapturing customer menu...');
      await capture(page, baseUrl, `/menu/${tableToken}`, 'menu.png', {
        waitSelector: '.menu-page, app-menu, .product-list, main',
        delayMs: 1500,
      });
    } else {
      console.log('\nSkipping menu (no table token from API)');
    }

    console.log('\nCapturing public Jul surfaces...');
    try {
      await capture(page, baseUrl, `/delivery/${tenantId}`, 'delivery.png', {
        waitSelector: '.delivery-checkout-page, app-delivery-checkout, .delivery-shell, main',
        delayMs: 1500,
      });
    } catch (err) {
      console.log('  (skipping delivery.png:', err.message + ')');
    }
    try {
      await capture(page, baseUrl, `/waitlist/${tenantId}`, 'waitlist.png', {
        waitSelector: '#wl-name, app-waitlist-public, main',
        delayMs: 1000,
      });
    } catch (err) {
      console.log('  (skipping waitlist.png:', err.message + ')');
    }

    if (providerEmail && providerPassword) {
      console.log('\nCapturing provider dashboard...');
      await page.goto(new URL('/provider/login', baseUrl).href, {
        waitUntil: 'networkidle2',
        timeout: 20000,
      });
      await page.type('input[type="email"], input[name="username"]', providerEmail);
      await page.type('input[type="password"]', providerPassword);
      await page.click('button[type="submit"]');
      await new Promise((r) => setTimeout(r, 4000));
      if (!page.url().includes('/provider') || page.url().includes('/provider/login')) {
        console.log('  (provider login failed, skipping provider.png)');
      } else {
        await capture(page, baseUrl, '/provider', 'provider.png', {
          waitSelector: '.provider-dashboard, app-provider-dashboard, main',
          delayMs: 1000,
        });
      }
    } else {
      console.log('\nSkipping provider (set PROVIDER_TEST_EMAIL and PROVIDER_TEST_PASSWORD to capture)');
    }

    if (courierEmail && courierPassword) {
      console.log('\nCapturing courier portal...');
      try {
        await page.goto(new URL('/courier/login', baseUrl).href, {
          waitUntil: 'networkidle2',
          timeout: 20000,
        });
        await page.waitForSelector('input[type="email"], input[name="username"]', {
          timeout: 10000,
        });
        await page.type('input[type="email"], input[name="username"]', courierEmail);
        await page.type('input[type="password"]', courierPassword);
        await page.click('button[type="submit"]');
        await new Promise((r) => setTimeout(r, 4000));
        if (page.url().includes('/courier/login')) {
          console.log('  (courier login failed, skipping courier.png)');
        } else {
          await capture(page, baseUrl, '/courier', 'courier.png', {
            waitSelector: '.courier-page, app-courier-home, main',
            delayMs: 1000,
          });
        }
      } catch (err) {
        console.log('  (skipping courier.png:', err.message + ')');
      }
    } else {
      console.log(
        '\nSkipping courier (set COURIER_EMAIL/COURIER_PASSWORD or COURIER_TEST_* to capture)',
      );
    }

    if (platformEmail && platformPassword) {
      console.log('\nCapturing platform operator dashboard...');
      try {
        await page.goto(new URL('/platform/login', baseUrl).href, {
          waitUntil: 'networkidle2',
          timeout: 20000,
        });
        await page.waitForSelector('input#email, input[type="email"]', { timeout: 10000 });
        const emailSel = (await page.$('input#email')) ? 'input#email' : 'input[type="email"]';
        await page.type(emailSel, platformEmail);
        await page.type('input#password, input[type="password"]', platformPassword);
        await page.click('button[type="submit"]');
        await new Promise((r) => setTimeout(r, 4000));
        if (!page.url().includes('/platform') || page.url().includes('/platform/login')) {
          console.log('  (platform login failed, skipping platform.png)');
        } else {
          await capture(page, baseUrl, '/platform', 'platform.png', {
            waitSelector: '.metric-card, app-platform-dashboard, main',
            delayMs: 1000,
          });
        }
      } catch (err) {
        console.log('  (skipping platform.png:', err.message + ')');
      }
    } else {
      console.log(
        '\nSkipping platform (set PLATFORM_OPERATOR_EMAIL and PLATFORM_OPERATOR_PASSWORD to capture)',
      );
    }

    console.log('\nDone. Screenshots in', outDir);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
