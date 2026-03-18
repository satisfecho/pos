#!/usr/bin/env node
/**
 * Puppeteer debug: Working plan calendar – inspect why red days (staffing issues) may not show.
 * Run: LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/debug-working-plan-calendar.mjs
 * Or: npm run test:working-plan --prefix front (uses same .env); then run this with BASE_URL set.
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
  let baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4200';
  const loginEmail = process.env.LOGIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;
  const tenantId = process.env.TENANT_ID || '1';

  if (!loginEmail || !loginPassword) {
    console.error('Set LOGIN_EMAIL and LOGIN_PASSWORD (or DEMO_* in .env)');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: process.env.HEADLESS === '1',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    await page.goto(new URL('/login?tenant=' + tenantId, baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    await page.click('button[type="submit"]');
    await sleep(4000);

    await page.goto(new URL('/working-plan', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('[data-testid="working-plan-page"]', { timeout: 10000 });

    // Switch to Calendar and wait for data: schedule + tenant settings load async
    await page.click('[data-testid="working-plan-view-calendar"]');
    await sleep(5000); // allow schedule + tenant settings to load and grid to recompute

    const grid = await page.$('[data-testid="working-plan-calendar-grid"]');
    if (!grid) {
      console.log('Calendar grid not found.');
      await browser.close();
      process.exit(1);
    }

    const info = await page.evaluate(() => {
      const gridEl = document.querySelector('[data-testid="working-plan-calendar-grid"]');
      if (!gridEl) return { error: 'no grid' };
      const cells = gridEl.querySelectorAll('.calendar-cell:not(.calendar-cell-header)');
      let withDay = 0;
      let withRed = 0;
      const sample = [];
      cells.forEach((c) => {
        const dayNum = c.querySelector('.calendar-day-num');
        if (dayNum) {
          withDay++;
          const hasRed = c.classList.contains('calendar-day-matches');
          if (hasRed) withRed++;
          if (sample.length < 10) sample.push({ day: dayNum.textContent, hasRed, classes: c.className });
        }
      });
      return { totalCells: cells.length, dayCells: withDay, redCells: withRed, sample };
    });

    console.log('Calendar debug:');
    console.log('  Total cells (excl. header):', info.totalCells);
    console.log('  Day cells (with number):', info.dayCells);
    console.log('  Red (staffing issue) cells:', info.redCells);
    console.log('  Sample day cells:', info.sample);
    if (info.redCells === 0 && info.dayCells > 0) {
      console.log('\n  -> No red days. Possible causes: opening_hours not loaded yet, or no personnel requirements set in Settings → Opening hours.');
    }

    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
}

main();
