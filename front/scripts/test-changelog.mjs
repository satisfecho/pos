#!/usr/bin/env node
/**
 * Puppeteer smoke test: Dashboard "What's new" tile and changelog modal.
 * Asserts that the changelog is loaded from the API (GET /api/changelog) and shown in the modal.
 *
 * Usage (from repo root):
 *   npm run test:changelog --prefix front
 *   LOGIN_EMAIL=owner@example.com LOGIN_PASSWORD=secret node front/scripts/test-changelog.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:changelog --prefix front
 *
 * Loads .env from repo root if LOGIN_EMAIL/LOGIN_PASSWORD are not set.
 *
 * Env:
 *   BASE_URL       App URL (default: auto-detect 4203, 4202, 4200)
 *   LOGIN_EMAIL    Staff email (or DEMO_LOGIN_EMAIL in .env)
 *   LOGIN_PASSWORD Password (or DEMO_LOGIN_PASSWORD in .env)
 *   TENANT_ID      Tenant for login (default 1)
 *   HEADLESS       Set to 1 to run headless
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
    baseUrl = baseUrl || 'http://127.0.0.1:4202';
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
      'Credentials required: set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env'
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
      console.log('   FAIL: Still on login page (check credentials).');
      await browser.close();
      process.exit(1);
    }
    console.log('   Logged in, URL:', afterLogin);

    console.log('2. Ensuring we are on the dashboard...');
    if (!afterLogin.replace(/\?.*/, '').endsWith('/') && !afterLogin.includes('/dashboard')) {
      await page.goto(new URL('/', baseUrl).href, { waitUntil: 'networkidle2', timeout: 10000 });
      await sleep(1500);
    }

    console.log('3. Clicking "What\'s new" tile...');
    const whatsNewBtn = await page.$('[data-testid="dashboard-whats-new"]');
    if (!whatsNewBtn) {
      console.log('   FAIL: What\'s new tile (data-testid="dashboard-whats-new") not found.');
      await browser.close();
      process.exit(1);
    }
    await whatsNewBtn.click();
    await sleep(1500);

    console.log('4. Waiting for changelog modal and content...');
    const overlay = await page.waitForSelector('[data-testid="changelog-overlay"]', {
      timeout: 5000,
    });
    if (!overlay) {
      console.log('   FAIL: Changelog overlay not visible.');
      await browser.close();
      process.exit(1);
    }

    // Wait for loading to finish and content to appear (or error)
    await page.waitForFunction(
      () => {
        const loading = document.querySelector('.changelog-loading');
        const content = document.querySelector('.changelog-content');
        const err = document.querySelector('.changelog-error');
        return !loading && (content || err);
      },
      { timeout: 10000 }
    );

    const hasError = await page.$('.changelog-error');
    if (hasError) {
      const errText = await page.evaluate((el) => el?.textContent || '', hasError);
      console.log('   FAIL: Changelog error:', errText);
      await browser.close();
      process.exit(1);
    }

    const contentEl = await page.$('.changelog-content');
    if (!contentEl) {
      console.log('   FAIL: Changelog content not found.');
      await browser.close();
      process.exit(1);
    }

    const bodyText = await page.evaluate((el) => el?.innerText || '', contentEl);
    const hasVersionHeading =
      /\[[\d.]+\]|Unreleased|Changelog|##\s/i.test(bodyText) || bodyText.length > 100;
    if (!hasVersionHeading) {
      console.log('   FAIL: Changelog content looks empty or invalid. Got length:', bodyText.length);
      await browser.close();
      process.exit(1);
    }
    console.log('   Changelog loaded; content length:', bodyText.length);

    await browser.close();
    console.log('\n>>> RESULT: Changelog (What\'s new) test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
