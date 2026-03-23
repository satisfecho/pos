#!/usr/bin/env node
/**
 * Puppeteer test: landing page shows version; optional login + sidebar navigation.
 *
 * Usage (from repo root):
 *   node front/scripts/test-landing-version.mjs
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-landing-version.mjs
 *
 * Env:
 *   BASE_URL   App URL (default: auto-detect port 4203, 4202, 4200 or http://satisfecho.de)
 *   HEADLESS   Default headless; set 0, false, or no for a visible browser.
 *   TENANT_ID  Login tenant (default 1). Used with DEMO_LOGIN_* / LOGIN_*.
 *
 * When LOGIN_EMAIL + LOGIN_PASSWORD or DEMO_LOGIN_EMAIL + DEMO_LOGIN_PASSWORD are set
 * (e.g. from repo root `.env`), after the landing check the script logs in at
 * `/login?tenant=1` and clicks every visible sidebar item (`a.nav-link`, then inventory
 * `a.nav-sublink` if present), asserting each navigation succeeds.
 * Without credentials, only the landing version assertion runs (smoke-friendly for CI).
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = val;
      }
    }
  }
}

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pathnameMatches(actual, expected) {
  if (actual === expected) return true;
  if (expected !== '/' && actual.startsWith(expected + '/')) return true;
  return false;
}

async function waitForPath(page, expectedPath, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    let p;
    try {
      p = new URL(page.url()).pathname;
    } catch {
      await sleep(50);
      continue;
    }
    if (pathnameMatches(p, expectedPath)) return;
    await sleep(100);
  }
  throw new Error(
    `Timeout waiting for path ${expectedPath}, last URL was ${page.url()}`
  );
}

async function clickSidebarNavLink(page, href, baseUrl) {
  const pathOnly = (href || '').split('?')[0];
  const expectedPath = new URL(pathOnly, baseUrl).pathname;
  const clicked = await page.evaluate((path) => {
    const norm = (h) => (h || '').split('?')[0];
    const links = Array.from(document.querySelectorAll('aside.sidebar > nav a.nav-link'));
    const a = links.find((el) => norm(el.getAttribute('href')) === path);
    if (a) {
      a.click();
      return true;
    }
    return false;
  }, pathOnly);
  if (!clicked) {
    throw new Error(`Sidebar nav-link not found for href ${pathOnly}`);
  }
  await waitForPath(page, expectedPath);
  await sleep(300);
}

async function clickSidebarSublink(page, href, baseUrl) {
  const pathOnly = (href || '').split('?')[0];
  const expectedPath = new URL(pathOnly, baseUrl).pathname;
  const clicked = await page.evaluate((path) => {
    const norm = (h) => (h || '').split('?')[0];
    const links = Array.from(document.querySelectorAll('aside.sidebar a.nav-sublink'));
    const a = links.find((el) => norm(el.getAttribute('href')) === path);
    if (a) {
      a.click();
      return true;
    }
    return false;
  }, pathOnly);
  if (!clicked) {
    throw new Error(`Sidebar nav-sublink not found for href ${pathOnly}`);
  }
  await waitForPath(page, expectedPath);
  await sleep(300);
}

async function ensureInventoryOpen(page) {
  const header = await page.$('aside.sidebar .nav-section button.nav-section-header');
  if (!header) return false;
  let n = await page.$$eval('aside.sidebar a.nav-sublink', (els) => els.length);
  if (n === 0) {
    await header.click();
    await sleep(400);
    n = await page.$$eval('aside.sidebar a.nav-sublink', (els) => els.length);
  }
  if (n === 0) {
    await header.click();
    await sleep(400);
  }
  return (await page.$$eval('aside.sidebar a.nav-sublink', (els) => els.length)) > 0;
}

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
    baseUrl = baseUrl || 'http://satisfecho.de';
  }

  const tenantId = process.env.TENANT_ID != null ? String(process.env.TENANT_ID) : '1';
  const loginEmail =
    process.env.LOGIN_EMAIL || process.env.ADMIN_EMAIL || process.env.DEMO_LOGIN_EMAIL;
  const loginPassword =
    process.env.LOGIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;
  const hasLoginCreds = !!(loginEmail && loginPassword);

  const headless = isHeadless();
  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  if (hasLoginCreds) {
    console.log('Login + sidebar: yes (tenant=' + tenantId + ')');
  } else {
    console.log('Login + sidebar: skip (set DEMO_LOGIN_EMAIL/DEMO_LOGIN_PASSWORD or LOGIN_* in .env)');
  }
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[browser]', msg.text()));

  try {
    await page.deleteCookie();

    console.log('1. Loading landing page (/)...');
    await page.goto(new URL('/', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });

    const urlAfterLanding = page.url();
    const pathAfterLanding = new URL(urlAfterLanding).pathname;
    if (pathAfterLanding === '/dashboard' || pathAfterLanding.startsWith('/login')) {
      console.log(
        '   Redirected to',
        pathAfterLanding,
        '- not on landing. Version check skipped (page is not landing).'
      );
      await browser.close();
      process.exit(0);
    }

    await page.waitForSelector('.landing-page', { timeout: 10000 });
    await page.waitForFunction(
      () => {
        const el =
          document.querySelector('[data-testid="landing-version"]') ||
          document.querySelector('.landing-version-bar');
        return el?.textContent?.trim().length > 0;
      },
      { timeout: 15000 }
    );

    const versionVisible = await page.evaluate(() => {
      const el =
        document.querySelector('[data-testid="landing-version"]') ||
        document.querySelector('.landing-version-bar');
      if (!el) return { found: false, text: '' };
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isVisible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0;
      return { found: true, text: (el.textContent || '').trim(), visible: isVisible };
    });

    if (!versionVisible.found) {
      console.log('   FAIL: [data-testid="landing-version"] not found in DOM.');
      await browser.close();
      process.exit(1);
    }

    if (!versionVisible.visible) {
      console.log('   FAIL: Version element exists but is not visible (display/opacity/rect).');
      await browser.close();
      process.exit(1);
    }

    const hasVersionLike = /[\d]+\.[\d]+\.[\d]+/.test(versionVisible.text);
    if (!versionVisible.text || !hasVersionLike) {
      console.log('   FAIL: Version text missing or invalid:', JSON.stringify(versionVisible.text));
      await browser.close();
      process.exit(1);
    }

    console.log('   Version element text:', versionVisible.text);

    if (!hasLoginCreds) {
      await browser.close();
      console.log('\n>>> RESULT: Landing page shows version.');
      process.exit(0);
    }

    console.log('2. Logging in (tenant=' + tenantId + ')...');
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('tenant', tenantId);
    await page.goto(loginUrl.href, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.type('input[type="email"]', loginEmail);
    await page.type('input[type="password"]', loginPassword);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(3500);
    }
    if (page.url().includes('/login')) {
      console.log('   FAIL: Still on login page (check credentials / tenant).');
      await browser.close();
      process.exit(1);
    }
    console.log('   OK: Logged in, URL:', page.url());

    await page.waitForSelector('aside.sidebar > nav a.nav-link', { timeout: 15000 });

    const topHrefs = await page.evaluate(() => {
      const norm = (h) => (h || '').split('?')[0];
      const links = Array.from(document.querySelectorAll('aside.sidebar > nav a.nav-link'));
      const out = [];
      const seen = new Set();
      for (const a of links) {
        const h = norm(a.getAttribute('href'));
        if (h && !h.startsWith('http') && !seen.has(h)) {
          seen.add(h);
          out.push(h);
        }
      }
      return out;
    });

    if (topHrefs.length === 0) {
      console.log('   FAIL: No sidebar nav-link items found.');
      await browser.close();
      process.exit(1);
    }

    console.log('3. Clicking sidebar nav links (' + topHrefs.length + ')...');
    // Fullscreen routes (e.g. /kitchen, /bar) omit the sidebar — always open links from /dashboard.
    for (let i = 0; i < topHrefs.length; i++) {
      const h = topHrefs[i];
      console.log('   [' + (i + 1) + '/' + topHrefs.length + '] -> ' + h);
      await page.goto(new URL('/dashboard', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.waitForSelector('aside.sidebar > nav a.nav-link', { timeout: 15000 });
      await sleep(400);
      await clickSidebarNavLink(page, h, baseUrl);
    }
    console.log('   OK: All top-level nav links navigated.');

    console.log('4. Inventory submenu (if visible for user)...');
    await page.goto(new URL('/dashboard', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(500);
    const opened = await ensureInventoryOpen(page);
    if (opened) {
      const subHrefs = await page.evaluate(() => {
        const norm = (x) => (x || '').split('?')[0];
        return Array.from(document.querySelectorAll('aside.sidebar a.nav-sublink'))
          .map((a) => norm(a.getAttribute('href')))
          .filter((h) => h && !h.startsWith('http'));
      });
      console.log('   Sublinks:', subHrefs.length);
      for (let i = 0; i < subHrefs.length; i++) {
        const h = subHrefs[i];
        console.log('   [inv ' + (i + 1) + '/' + subHrefs.length + '] -> ' + h);
        await page.goto(new URL('/dashboard', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForSelector('aside.sidebar > nav a.nav-link', { timeout: 15000 });
        await sleep(400);
        const ok = await ensureInventoryOpen(page);
        if (!ok) {
          throw new Error('Inventory submenu did not open before clicking ' + h);
        }
        await clickSidebarSublink(page, h, baseUrl);
      }
      console.log('   OK: Inventory sublinks navigated.');
    } else {
      console.log('   (No inventory section or submenu — skipped.)');
    }

    await browser.close();
    console.log('\n>>> RESULT: Landing version OK; demo login (tenant=' + tenantId + ') OK; sidebar nav OK.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
