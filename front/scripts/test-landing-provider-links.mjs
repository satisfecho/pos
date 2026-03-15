#!/usr/bin/env node
/**
 * Puppeteer test: landing page shows provider login and provider registration links in the footer.
 *
 * Usage (from repo root):
 *   node front/scripts/test-landing-provider-links.mjs
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-landing-provider-links.mjs
 *
 * Env:
 *   BASE_URL   App URL (default: auto-detect port 4203, 4202, 4200 or http://satisfecho.de)
 *   HEADLESS   Set to 1 to run headless (default: 0 = visible browser)
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
  page.on('console', (msg) => console.log('[browser]', msg.text()));

  try {
    await page.deleteCookie();

    console.log('1. Loading landing page (/)...');
    await page.goto(new URL('/', baseUrl).href, { waitUntil: 'networkidle2', timeout: 15000 });

    const url = page.url();
    if (!url.endsWith('/') && !url.replace(/\/$/, '').endsWith(new URL(baseUrl).host + '')) {
      const path = new URL(url).pathname;
      if (path === '/dashboard' || path.startsWith('/login')) {
        console.log('   Redirected to', path, '- not on landing. Skipping.');
        await browser.close();
        process.exit(0);
      }
    }

    await page.waitForSelector('.landing-page', { timeout: 10000 });
    await page.waitForSelector('.landing-footer', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500));

    const providerLoginEl = await page.$('[data-testid="landing-provider-login"]');
    const providerRegisterEl = await page.$('[data-testid="landing-provider-register"]');

    if (!providerLoginEl) {
      const footerLinks = await page.evaluate(() => {
        const footer = document.querySelector('.landing-footer');
        const links = footer ? Array.from(footer.querySelectorAll('a')).map((a) => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') || '' })) : [];
        return links;
      });
      console.log('   FAIL: "Provider login" link not found ([data-testid="landing-provider-login"] or footer link to /provider/login).');
      console.log('   Footer links:', JSON.stringify(footerLinks, null, 2));
      await browser.close();
      process.exit(1);
    }
    if (!providerRegisterEl) {
      const footerLinks = await page.evaluate(() => {
        const footer = document.querySelector('.landing-footer');
        const links = footer ? Array.from(footer.querySelectorAll('a')).map((a) => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') || '' })) : [];
        return links;
      });
      console.log('   FAIL: "Register as provider" link not found ([data-testid="landing-provider-register"] or footer link to /provider/register).');
      console.log('   Footer links:', JSON.stringify(footerLinks, null, 2));
      await browser.close();
      process.exit(1);
    }

    console.log('   Provider login link: OK');
    console.log('   Register as provider link: OK');

    const registerHref = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="landing-provider-register"]');
      return el ? (el.getAttribute('href') || el.getAttribute('ng-reflect-router-link')) : null;
    });
    const registerUrl = registerHref ? new URL(registerHref, baseUrl).href : new URL('/provider/register', baseUrl).href;

    console.log('2. Navigating to provider register page...');
    await page.goto(registerUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('input#provider_name', { timeout: 10000 });

    const afterUrl = page.url();
    if (!afterUrl.includes('/provider/register')) {
      console.log('   FAIL: Expected URL to contain /provider/register, got:', afterUrl);
      await browser.close();
      process.exit(1);
    }

    const hasRegisterForm = await page.evaluate(() => !!document.querySelector('input#provider_name'));
    if (!hasRegisterForm) {
      console.log('   FAIL: Provider register page should show a registration form.');
      await browser.close();
      process.exit(1);
    }

    console.log('   Provider register page loaded: OK');
    await browser.close();
    console.log('\n>>> RESULT: Landing shows provider login and register links; register link works.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
