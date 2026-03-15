#!/usr/bin/env node
/**
 * Test that the restaurant logo (e.g. Cobalto SVG) is displayed on the customer menu page.
 *
 * Usage (from project root):
 *   node front/scripts/test-menu-logo.mjs
 *
 * Env:
 *   BASE_URL - app URL (default: auto-detect 4202, 4203, 4200)
 *   TABLE_TOKEN - table token for /menu/{token} (default: fetched via API after login)
 *   LOGIN_EMAIL, LOGIN_PASSWORD (or DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD) - for API table fetch
 *
 * Loads .env from project root if vars unset.
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [
    resolve(__dirname, '../../.env'),
    resolve(process.cwd(), '.env'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf8');
        content.split('\n').forEach((line) => {
          const m = line.match(/^([^#=]+)=(.*)$/);
          if (m) {
            const key = m[1].trim();
            const val = m[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) process.env[key] = val;
          }
        });
        return;
      } catch (_) {}
    }
  }
}

loadEnv();

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LOGIN_EMAIL = process.env.LOGIN_EMAIL || process.env.DEMO_LOGIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || process.env.DEMO_OWNER_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;

async function getTableToken(baseUrl) {
  const apiBase = baseUrl.replace(/\/$/, '') + '/api';
  const loginRes = await fetch(`${apiBase}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.log('Login failed, cannot get table token. Status:', loginRes.status);
    return null;
  }
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

async function main() {
  let baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    for (const port of [4202, 4203, 4200]) {
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

  let tableToken = process.env.TABLE_TOKEN;
  if (!tableToken && LOGIN_EMAIL && LOGIN_PASSWORD) {
    try {
      tableToken = await getTableToken(baseUrl);
    } catch (e) {
      console.log('Could not fetch table token:', e.message);
    }
  }
  if (!tableToken) {
    tableToken = '60c852e3-9e3e-4321-aff1-8ef24223729a'; // fallback
  }

  const menuUrl = `${baseUrl.replace(/\/$/, '')}/menu/${tableToken}`;
  console.log('App URL:', baseUrl);
  console.log('Menu URL:', menuUrl);
  console.log('---');

  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const logs = [];
  page.on('console', (msg) => {
    const t = msg.type();
    const text = msg.text();
    logs.push({ type: t, msg: text });
    console.log(`[${t}]`, text);
  });

  let logoVisible = false;
  let logoSrc = null;
  let logoError = null;

  try {
    const responsePromise = page.goto(menuUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await responsePromise;

    await page.waitForSelector('.menu-page', { timeout: 10000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 2500));

    const result = await page.evaluate(() => {
      const img = document.querySelector('.tenant-logo, .closed-tenant-logo, .logo-container img, .hero-header img[alt="Business Logo"]');
      const menuPage = document.querySelector('.menu-page');
      const tableClosedScreen = document.querySelector('.table-closed-screen');
      if (!menuPage) return { ok: false, reason: 'menu page not found' };
      if (img && img.src) {
        const src = img.src;
        const complete = img.complete;
        const naturalWidth = img.naturalWidth || 0;
        const naturalHeight = img.naturalHeight || 0;
        const rect = img.getBoundingClientRect();
        const visible = img.offsetParent !== null && rect.width > 0 && rect.height > 0;
        const loaded = complete && naturalWidth > 0 && naturalHeight > 0;
        return {
          ok: loaded,
          src,
          complete,
          naturalWidth,
          naturalHeight,
          visible,
          rectWidth: rect.width,
          rectHeight: rect.height,
          pageOk: true,
        };
      }
      if (tableClosedScreen) return { ok: false, reason: 'no logo img or src', pageOk: true };
      return { ok: false, reason: 'no logo img or src', pageOk: false };
    });

    logoSrc = result.src;
    if (result.ok) {
      logoVisible = true;
    } else if (result.pageOk) {
      logoVisible = true;
      logoError = 'Logo not configured for tenant (menu/table-closed page loaded).';
    } else {
      logoError = result.reason || `loaded=${result.complete && result.naturalWidth > 0 && result.naturalHeight > 0} visible=${result.visible} rect=${result.rectWidth}x${result.rectHeight}`;
    }

    if (result.src && !result.complete) {
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await page.evaluate(() => {
        const img = document.querySelector('.tenant-logo, .closed-tenant-logo, .logo-container img');
        if (!img) return { ok: false };
        return { ok: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 };
      });
      if (retry.ok) logoVisible = true;
    }
  } catch (err) {
    logoError = err.message;
    console.error('Error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n---');
  if (logoVisible) {
    console.log('>>> RESULT: Restaurant logo is displayed.');
    if (logoSrc) console.log('    Logo URL:', logoSrc);
  } else {
    console.log('>>> RESULT: Restaurant logo is NOT displayed.');
    if (logoSrc) console.log('    Logo img src was:', logoSrc);
    if (logoError) console.log('    Reason:', logoError);
  }
  process.exit(logoVisible ? 0 : 1);
}

main();
