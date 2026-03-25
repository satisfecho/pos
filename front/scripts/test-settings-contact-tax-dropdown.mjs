#!/usr/bin/env node
/**
 * Puppeteer smoke test: Settings → Contact information → default tax dropdown.
 *
 * Checks that the default tax select is populated with at least one IVA option
 * (e.g. "IVA 10%") instead of rendering as an empty wrapper.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run <script> --prefix front
 *   Or (from repo root):
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-settings-contact-tax-dropdown.mjs
 *
 * Env:
 *   LOGIN_EMAIL / LOGIN_PASSWORD (or DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD from .env)
 *   TENANT_ID (default: 1)
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
  console.log('Login as tenant:', tenantId);

  if (!loginEmail || !loginPassword) {
    console.error('Credentials required: set LOGIN_EMAIL/LOGIN_PASSWORD or DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD in .env.');
    process.exit(1);
  }

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
    console.log('1. Logging in...');
    await page.goto(new URL(`/login?tenant=${tenantId}`, baseUrl).href, {
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
      console.log('FAIL: Still on login page (check credentials and tenant).');
      await browser.close();
      process.exit(1);
    }

    console.log('2. Opening Settings...');
    await page.goto(new URL('/settings', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await sleep(2000);

    console.log('3. Opening Contact information...');
    const contactTab = await page.$('[data-testid="settings-contact-tab"]');
    if (!contactTab) {
      console.log('FAIL: Contact tab not found (data-testid=settings-contact-tab).');
      await browser.close();
      process.exit(1);
    }
    await contactTab.click();
    await sleep(2000);

    console.log('4. Checking default tax dropdown options...');
    const select = await page.$('select#default_tax_id');
    if (!select) {
      console.log('FAIL: default tax select not found (select#default_tax_id).');
      await browser.close();
      process.exit(1);
    }

    const optionTexts = await page.$$eval('#default_tax_id option', (els) =>
      els.map((e) => e.textContent || '')
    );

    const ivaOptions = optionTexts.filter((t) => /IVA\s*\d+%/i.test(t));
    if (ivaOptions.length < 1) {
      console.log('FAIL: No IVA options found. Options:', optionTexts);
      await browser.close();
      process.exit(1);
    }

    const hasTenPercent = ivaOptions.some((t) => /IVA\s*10%/i.test(t));
    if (!hasTenPercent) {
      console.log('FAIL: Expected an "IVA 10%" option. IVA options:', ivaOptions);
      await browser.close();
      process.exit(1);
    }

    console.log('>>> RESULT: Settings contact default tax dropdown populated.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err?.message || err);
    await browser.close();
    process.exit(1);
  }
}

main();

