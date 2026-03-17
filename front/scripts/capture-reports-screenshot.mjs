#!/usr/bin/env node
/** One-off: capture /reports full-page screenshot to docs/screenshots/reports-review.png */
import { createRequire } from 'module';
import { mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const envPath = join(repoRoot, '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4202';
const email = process.env.LOGIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
const password = process.env.LOGIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;

async function main() {
  if (!email || !password) {
    console.error('Set LOGIN_EMAIL and LOGIN_PASSWORD (or DEMO_*)');
    process.exit(1);
  }
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200 });
  await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 4000));
  await page.goto(new URL('/reports', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
  await page.waitForSelector('[data-testid="reports-page"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 3500));
  const outDir = join(repoRoot, 'docs', 'screenshots');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, 'reports-review.png');
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log('Saved:', out);
}

main().catch((e) => { console.error(e); process.exit(1); });
