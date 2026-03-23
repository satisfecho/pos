#!/usr/bin/env node
/**
 * Puppeteer smoke test: Settings → Providers (personal providers feature).
 * Logs in with .env credentials (tenant=1), opens Settings, goes to Providers tab,
 * and asserts the Providers section and Add provider button are present.
 *
 * Usage (from repo root):
 *   npm run test:settings-providers --prefix front
 *   # Uses .env: DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD; TENANT_ID=1
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:settings-providers --prefix front
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200)
 *   LOGIN_EMAIL    Override (or DEMO_LOGIN_EMAIL from .env)
 *   LOGIN_PASSWORD Override (or DEMO_LOGIN_PASSWORD from .env)
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
      'Credentials required: set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env (tenant=1 account).'
    );
    process.exit(1);
  }
  console.log('Login as:', loginEmail, '(tenant=1)');
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 1280, height: 720 }, // wide enough so tab labels (e.g. Providers) are visible
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[browser]', msg.text()));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const tenantId = process.env.TENANT_ID || process.env.LOGIN_TENANT_ID || '1';

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
      console.log('   FAIL: Still on login page (check credentials and tenant).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in, URL:', afterLogin);

    console.log('2. Opening Settings...');
    await page.goto(new URL('/settings', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    if (!page.url().includes('/settings')) {
      console.log('   FAIL: Not on /settings.');
      await browser.close();
      process.exit(1);
    }
    await sleep(2000); // let Settings tabs render (lazy/async)

    console.log('3. Clicking Providers tab...');
    let providersTab = await page.$('[data-testid="settings-providers-tab"]');
    if (!providersTab) {
      // Fallback: tab by visible text (Providers / Proveedores)
      const tabs = await page.$$('button.tab');
      for (const tab of tabs) {
        const text = await page.evaluate((el) => el.textContent || '', tab);
        if (/Providers|Proveedores/i.test(text)) {
          providersTab = tab;
          break;
        }
      }
    }
    if (!providersTab) {
      console.log('   FAIL: Providers tab not found (data-testid or text "Providers"/"Proveedores").');
      await browser.close();
      process.exit(1);
    }
    await providersTab.click();
    await sleep(2500); // load providers list

    console.log('4. Checking Providers section and Add provider button...');
    const section = await page.waitForSelector('[data-testid="settings-providers-section"]', {
      timeout: 10000,
    }).catch(() => null);
    if (!section) {
      console.log('   FAIL: Providers section (data-testid="settings-providers-section") not found.');
      await browser.close();
      process.exit(1);
    }
    const addProviderBtn = await page.$('[data-testid="settings-add-provider-btn"]');
    if (!addProviderBtn) {
      console.log('   FAIL: Add provider button (data-testid="settings-add-provider-btn") not found.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Providers section and Add provider button present.');

    await browser.close();
    console.log('\n>>> RESULT: Settings Providers smoke test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
