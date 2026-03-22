#!/usr/bin/env node
/**
 * Puppeteer test: landing page shows version number in the footer.
 *
 * Usage (from repo root):
 *   node front/scripts/test-landing-version.mjs
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-landing-version.mjs
 *
 * Env:
 *   BASE_URL   App URL (default: auto-detect port 4203, 4202, 4200 or http://satisfecho.de)
 *   HEADLESS  Set to 1 to run headless (default: 0 = visible browser)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

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
    baseUrl = baseUrl || 'http://satisfecho.de';
  }

  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    const t = msg.text();
    // Landing may probe an authenticated API; 401 is expected and clutters CI logs.
    if (/status of 401 \(Unauthorized\)/.test(t) && /Failed to load resource/.test(t)) return;
    console.log('[browser]', t);
  });

  try {
    // Clear cookies so we hit landing (not redirect to dashboard when logged in)
    await page.deleteCookie();

    console.log('1. Loading landing page (/)...');
    await page.goto(new URL('/', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });

    // If we were redirected to dashboard (e.g. already logged in elsewhere), we're not on landing
    const url = page.url();
    if (!url.endsWith('/') && !url.replace(/\/$/, '').endsWith(new URL(baseUrl).host + '')) {
      const path = new URL(url).pathname;
      if (path === '/dashboard' || path.startsWith('/login')) {
        console.log('   Redirected to', path, '- not on landing. Version check skipped (page is not landing).');
        await browser.close();
        process.exit(0);
      }
    }

    // Wait for landing page to be present (Angular may render after bootstrap)
    await page.waitForSelector('.landing-page', { timeout: 10000 });
    // Version bar: data-testid or .landing-version-bar (always in template; allow time for lazy route)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="landing-version"]') || document.querySelector('.landing-version-bar');
        return el?.textContent?.trim().length > 0;
      },
      { timeout: 15000 }
    );

    const versionVisible = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="landing-version"]') || document.querySelector('.landing-version-bar');
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

    await browser.close();

    if (!versionVisible.found) {
      console.log('   FAIL: [data-testid="landing-version"] not found in DOM.');
      process.exit(1);
    }

    if (!versionVisible.visible) {
      console.log('   FAIL: Version element exists but is not visible (display/opacity/rect).');
      process.exit(1);
    }

    // Version should look like "1.0.1" or "1.0.1 abc1234" (version + optional hash)
    const hasVersionLike = /[\d]+\.[\d]+\.[\d]+/.test(versionVisible.text);
    if (!versionVisible.text || !hasVersionLike) {
      console.log('   FAIL: Version text missing or invalid:', JSON.stringify(versionVisible.text));
      process.exit(1);
    }

    console.log('   Version element text:', versionVisible.text);
    console.log('\n>>> RESULT: Landing page shows version.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
