#!/usr/bin/env node
/**
 * Puppeteer smoke: public /features marketing page.
 * Asserts page shell (hero title, at least one category), register CTA or home nav, no pageerrors.
 *
 * Usage (from repo root):
 *   BASE_URL=http://127.0.0.1:4202 npm run test:features --prefix front
 *   node front/scripts/test-features.mjs
 *
 * Env:
 *   BASE_URL   App URL (default: auto-detect port 4203, 4202, 4200 or http://127.0.0.1:4202)
 *   HEADLESS   Default headless; set 0, false, or no for a visible browser.
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function resolveBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  for (const port of [4203, 4202, 4200]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'head',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok || res.status < 500) return `http://127.0.0.1:${port}`;
    } catch (_) {}
  }
  return 'http://127.0.0.1:4202';
}

async function main() {
  const baseUrl = await resolveBaseUrl();
  const headless = isHeadless();
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
  const pageErrors = [];
  const badResponses = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res) => {
    const u = res.url();
    if (!u.includes('/features') && !u.endsWith('/features')) return;
    if (res.status() >= 400) badResponses.push(`${res.status()} ${u}`);
  });

  try {
    console.log('1. Loading /features...');
    const featuresUrl = new URL('/features', baseUrl).href;
    const response = await page.goto(featuresUrl, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    if (!response || response.status() >= 400) {
      console.error('FAIL: HTTP status for /features:', response?.status());
      process.exit(1);
    }
    const path = new URL(page.url()).pathname;
    if (path !== '/features' && !path.startsWith('/features/')) {
      console.error('FAIL: Expected path /features, got:', page.url());
      process.exit(1);
    }

    console.log('2. Waiting for features page shell...');
    await page.waitForSelector('.features-page', { timeout: 15000 });
    await page.waitForSelector('.features-hero__title', { timeout: 10000 });
    await page.waitForSelector('.features-category', { timeout: 10000 });

    const shell = await page.evaluate(() => {
      const titleEl = document.querySelector('.features-hero__title');
      const title = (titleEl?.textContent || '').trim();
      const categories = document.querySelectorAll('.features-category').length;
      const brandHome = document.querySelector('a.features-nav__brand');
      const brandHref = brandHome?.getAttribute('href') || '';
      const registerCtas = Array.from(
        document.querySelectorAll('a.features-nav__cta, a.features-btn--primary')
      );
      const registerOk = registerCtas.some((a) => {
        const href = a.getAttribute('href') || '';
        return href.includes('/register');
      });
      const rawKeyDump =
        title.includes('FEATURES_PAGE.') ||
        (document.body?.innerText || '').includes('FEATURES_PAGE.TITLE');
      return {
        title,
        categories,
        brandHref,
        registerOk,
        rawKeyDump,
      };
    });

    if (!shell.title || shell.rawKeyDump) {
      console.error(
        'FAIL: Hero title missing or untranslated FEATURES_PAGE key. Got:',
        JSON.stringify(shell.title)
      );
      process.exit(1);
    }
    console.log('   Hero title:', shell.title);

    if (shell.categories < 1) {
      console.error('FAIL: Expected at least one .features-category section.');
      process.exit(1);
    }
    console.log('   Category sections:', shell.categories);

    // Angular routerLink="/" usually renders href="/"
    let brandIsHome = false;
    try {
      brandIsHome =
        shell.brandHref === '/' ||
        shell.brandHref === '' ||
        new URL(shell.brandHref, baseUrl).pathname === '/';
    } catch {
      brandIsHome = false;
    }
    if (!brandIsHome && !shell.registerOk) {
      console.error(
        'FAIL: Expected brand link to / or a register CTA. brandHref=',
        JSON.stringify(shell.brandHref),
        'registerOk=',
        shell.registerOk
      );
      process.exit(1);
    }
    if (brandIsHome) console.log('   Brand nav to home: OK');
    if (shell.registerOk) console.log('   Register CTA: OK');

    console.log('3. Checking split-bill + join-tables marketing cards (#443)...');
    for (const slug of ['split-bill', 'join-tables']) {
      const href = `/features/${slug}`;
      const link = await page.$(`a.features-card__link[href="${href}"]`);
      if (!link) {
        console.error(`FAIL: No link to ${href} on /features grid.`);
        process.exit(1);
      }
      console.log(`   Grid link to ${href}: OK`);
    }

    console.log('4. Opening feature detail /features/reservations from grid...');
    const hasDetailLink = await page.$('a.features-card__link[href="/features/reservations"]');
    if (!hasDetailLink) {
      console.error('FAIL: No link to /features/reservations on /features grid.');
      process.exit(1);
    }
    console.log('   Grid link to /features/reservations: OK');
    const detailHref = new URL('/features/reservations', baseUrl).href
    const detailResponse = await page.goto(detailHref, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    if (!detailResponse || detailResponse.status() >= 400) {
      console.error('FAIL: HTTP status for /features/reservations:', detailResponse?.status());
      process.exit(1);
    }
    const detailPath = new URL(page.url()).pathname;
    if (detailPath !== '/features/reservations') {
      console.error('FAIL: Expected /features/reservations, got:', page.url());
      process.exit(1);
    }
    await page.waitForSelector('.feature-detail-page', { timeout: 15000 });
    await page.waitForSelector('[data-testid="feature-detail-title"]', { timeout: 10000 });
    const detailShell = await page.evaluate(() => {
      const titleEl = document.querySelector('[data-testid="feature-detail-title"]');
      const title = (titleEl?.textContent || '').trim();
      const benefits = document.querySelectorAll('.feature-detail-list__item').length;
      const rawKeyDump =
        title.includes('FEATURE_DETAIL.') || (document.body?.innerText || '').includes('FEATURE_DETAIL.ITEMS');
      return { title, benefits, rawKeyDump };
    });
    if (!detailShell.title || detailShell.rawKeyDump) {
      console.error('FAIL: Detail hero missing or untranslated key:', JSON.stringify(detailShell.title));
      process.exit(1);
    }
    if (detailShell.benefits < 2) {
      console.error('FAIL: Expected at least 2 benefit bullets on detail page.');
      process.exit(1);
    }
    console.log('   Detail hero:', detailShell.title);
    console.log('   Benefit bullets:', detailShell.benefits);

    if (badResponses.length) {
      console.error('FAIL: Bad HTTP for /features document:', badResponses);
      process.exit(1);
    }
    if (pageErrors.length) {
      console.error('FAIL: pageerror(s):', pageErrors);
      process.exit(1);
    }

    await browser.close();
    console.log('\n>>> RESULT: /features loads with hero, categories, nav/CTA, and /features/reservations detail page.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
