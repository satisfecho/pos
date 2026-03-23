#!/usr/bin/env node
/**
 * Puppeteer test: Settings page logo upload.
 * Logs in as owner/admin, goes to Settings, uploads a logo file, saves, and checks for success.
 *
 * Usage (from repo root):
 *   npm run test:settings-logo --prefix front
 *   LOGIN_EMAIL=owner@amvara.de LOGIN_PASSWORD=secret node front/scripts/test-settings-logo-upload.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:settings-logo --prefix front
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200)
 *   LOGIN_EMAIL    Owner/admin email (or DEMO_LOGIN_EMAIL in .env)
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

const FIXTURE_PATH = join(__dirname, 'fixtures', 'logo-test.svg');

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
      'Credentials required: set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env. User must be owner or admin.'
    );
    process.exit(1);
  }
  if (!existsSync(FIXTURE_PATH)) {
    console.error('Fixture not found:', FIXTURE_PATH);
    process.exit(1);
  }
  const fixturePath = resolve(FIXTURE_PATH);
  console.log('Login as:', loginEmail);
  console.log('Logo fixture:', fixturePath);
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
      console.log('   FAIL: Still on login page (check credentials; user must be owner or admin).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in, URL:', afterLogin);

    console.log('2. Navigating to Settings...');
    await page.goto(new URL('/settings', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    if (!page.url().includes('/settings')) {
      console.log('   FAIL: Not on /settings');
      await browser.close();
      process.exit(1);
    }
    await sleep(1500);

    console.log('3. Waiting for Settings form (General section with logo upload)...');
    await page.waitForSelector('#logo-upload', { timeout: 10000 });
    await page.waitForSelector('label[for="logo-upload"]', { timeout: 5000 });

    console.log('4. Setting logo file on input via uploadFile...');
    const fileInput = await page.$('#logo-upload');
    if (!fileInput) {
      console.log('   FAIL: #logo-upload not found');
      await browser.close();
      process.exit(1);
    }
    await fileInput.uploadFile(fixturePath);
    await fileInput.dispose();
    await sleep(1500);

    console.log('5. Clicking Save...');
    const saveBtn = await page.$('button[type="submit"]');
    if (!saveBtn) {
      console.log('   FAIL: Submit button not found');
      await browser.close();
      process.exit(1);
    }
    await saveBtn.click();
    await sleep(5000);

    console.log('6. Checking for success or error message...');
    const hasError = await page.evaluate(() => {
      const el = document.querySelector('.toast.error, .error-message, [class*="error"]');
      if (!el) return false;
      const text = (el.textContent || '').toLowerCase();
      return text.includes('failed to upload logo');
    });
    const hasSuccess = await page.evaluate(() => {
      const el = document.querySelector('.toast.success, .success-message, [class*="success"]');
      if (!el) return false;
      return (el.textContent || '').toLowerCase().includes('saved');
    });
    const pageText = await page.evaluate(() => document.body.innerText || '');

    if (hasError && pageText.includes('Failed to upload logo')) {
      console.log('   FAIL: "Failed to upload logo" shown.');
      await browser.close();
      process.exit(1);
    }
    if (hasSuccess) {
      console.log('   Success message visible.');
    } else if (!hasError) {
      console.log('   No error message; assuming save in progress or success (no failure text).');
    }

    // --- 7. Sidebar navigation: visit every link and ensure no 5xx errors ---
    console.log('\n7. Sidebar navigation smoke: visiting each nav link...');
    const failedResponses = [];
    const responseHandler = async (response) => {
      const status = response.status();
      if (status >= 500) {
        const url = response.url();
        failedResponses.push({ url, status });
      }
    };
    page.on('response', responseHandler);

    // Expand inventory section so sublinks are in the DOM and visible
    await page.evaluate(() => {
      const invHeader = document.querySelector('.nav-section-header');
      if (invHeader && invHeader.textContent && invHeader.textContent.includes('Inventory')) {
        invHeader.click();
      }
    });
    await sleep(600);

    const getSidebarPaths = async () => {
      return await page.evaluate(() => {
        const paths = new Set();
        document.querySelectorAll('.sidebar a.nav-link[href], .sidebar a.nav-sublink[href]').forEach((a) => {
          const href = a.getAttribute('href');
          if (href && href.startsWith('/') && !href.startsWith('//')) {
            const path = href.split('?')[0];
            if (path !== '') paths.add(path);
          }
        });
        return Array.from(paths);
      });
    };

    const paths = await getSidebarPaths();
    const sortedPaths = [...paths].sort();
    console.log('   Nav paths to check:', sortedPaths.join(', ') || '(none)');

    for (const path of sortedPaths) {
      failedResponses.length = 0;
      const url = new URL(path, baseUrl).href;
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      } catch (e) {
        console.log('   FAIL: Navigation to', path, ':', e.message);
        await browser.close();
        process.exit(1);
      }
      await sleep(800);
      if (failedResponses.length > 0) {
        console.log('   FAIL: Page', path, 'returned server errors:', failedResponses);
        await browser.close();
        process.exit(1);
      }
      console.log('   OK:', path);
    }

    page.off('response', responseHandler);
    console.log('   All', sortedPaths.length, 'sidebar routes loaded without 5xx.');

    await browser.close();
    console.log('\n>>> RESULT: Logo upload and sidebar navigation smoke test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
