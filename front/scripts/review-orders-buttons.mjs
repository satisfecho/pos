#!/usr/bin/env node
/**
 * One-off: Login (tenant=1 from .env), open /orders, capture screenshots of
 * Active and History view to review print/Factura buttons.
 * Screenshots saved to front/scripts/screenshots/
 *
 * Usage (from repo root):
 *   node front/scripts/review-orders-buttons.mjs
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/review-orders-buttons.mjs
 */

import { createRequire } from 'module';
import { readFileSync, existsSync, mkdirSync } from 'fs';
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
  let baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4202';
  const loginEmail = process.env.LOGIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;
  const tenantId = process.env.TENANT_ID || '1';

  if (!loginEmail || !loginPassword) {
    console.error('Set DEMO_LOGIN_EMAIL and DEMO_LOGIN_PASSWORD in .env');
    process.exit(1);
  }

  const screenshotDir = join(__dirname, 'screenshots');
  if (!existsSync(screenshotDir)) {
    mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    console.log('Login (tenant=' + tenantId + ')...');
    await page.goto(new URL('/login?tenant=' + tenantId, baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    await page.click('button[type="submit"]');
    await sleep(4000);

    console.log('Open /orders...');
    await page.goto(new URL('/orders', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2500);

    const activePath = join(screenshotDir, 'orders-active.png');
    await page.screenshot({ path: activePath });
    console.log('Saved:', activePath);

    let historyBtn = null;
    const tabs = await page.$$('button.tab, button[class*="tab"]');
    for (const b of tabs) {
      const text = await page.evaluate((e) => (e && e.textContent) || '', b);
      if (/history|historial/i.test(text)) {
        historyBtn = b;
        break;
      }
    }
    if (historyBtn) {
      await historyBtn.click();
      await sleep(3000);
      const historyPath = join(screenshotDir, 'orders-history.png');
      await page.screenshot({ path: historyPath });
      console.log('Saved:', historyPath);
    } else {
      console.log('History tab not found; only active screenshot saved.');
    }

    await browser.close();
    console.log('Done.');
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
}

main();
