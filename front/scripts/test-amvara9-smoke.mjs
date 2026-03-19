#!/usr/bin/env node
/**
 * Puppeteer smoke test for amvara9 production (www.satisfecho.de).
 * Visits landing, login, public book page, and checks API health. No login required.
 *
 * Usage (from repo root):
 *   node front/scripts/test-amvara9-smoke.mjs
 *   BASE_URL=https://www.satisfecho.de HEADLESS=1 node front/scripts/test-amvara9-smoke.mjs
 *
 * Env:
 *   BASE_URL   Base URL (default: https://www.satisfecho.de)
 *   HEADLESS  Set to 1 to run headless
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const DEFAULT_BASE = 'https://www.satisfecho.de';

async function main() {
  const baseUrl = process.env.BASE_URL || DEFAULT_BASE;
  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';

  console.log('amvara9 smoke test');
  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  console.log('---');

  const apiBase = baseUrl.replace(/\/$/, '');
  const failures = [];

  // 1. API health (no browser)
  try {
    const res = await fetch(`${apiBase}/api/health`, {
      method: 'get',
      signal: AbortSignal.timeout(10000),
    });
    const ok = res.ok && res.status < 500;
    const body = ok ? await res.json().catch(() => ({})) : null;
    if (!ok) {
      failures.push({ step: 'API /api/health', status: res.status, body });
    } else {
      console.log('1. API /api/health:', res.status, body?.status ?? '');
    }
  } catch (e) {
    failures.push({ step: 'API /api/health', error: e.message });
    console.log('1. API /api/health: FAIL', e.message);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 500 && url.startsWith(apiBase)) {
      failures.push({ step: 'page load', url: url.slice(apiBase.length) || '/', status });
    }
  });

  const goto = async (path, name) => {
    const url = new URL(path, baseUrl).href;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      const finalUrl = page.url();
      if (!finalUrl.startsWith(apiBase.replace('https://', 'https://').replace('http://', 'http://'))) {
        console.log('   Redirect to', finalUrl);
      }
      console.log('   OK:', name || path);
      return true;
    } catch (e) {
      failures.push({ step: name || path, error: e.message });
      console.log('   FAIL:', name || path, e.message);
      return false;
    }
  };

  try {
    console.log('2. Landing (/)...');
    await goto('/', 'Landing');
    await page.waitForSelector('.landing-page, [data-testid="landing-version"], .landing-version-bar', { timeout: 10000 }).catch(() => null);

    console.log('3. Login (/login)...');
    await goto('/login', 'Login');

    console.log('4. Public book (/book/1)...');
    await goto('/book/1', 'Book');

    await browser.close();
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }

  if (failures.length > 0) {
    console.log('\n--- Failures ---');
    failures.forEach((f) => console.log(JSON.stringify(f)));
    process.exit(1);
  }

  console.log('\n>>> RESULT: amvara9 smoke test passed (API + landing + login + book).');
  process.exit(0);
}

main();
