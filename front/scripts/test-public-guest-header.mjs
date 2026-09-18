#!/usr/bin/env node
/**
 * Puppeteer: public guest sticky header on /book/:tenantId (#376).
 *
 * Usage (from repo root, app running):
 *   node front/scripts/test-public-guest-header.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-public-guest-header.mjs
 *
 * Env: BASE_URL, TENANT_ID (default 1), HEADLESS (default headless; 0/false/no = visible)
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TENANT_ID = Number(process.env.TENANT_ID || 1);

async function detectBaseUrl() {
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
    baseUrl = baseUrl || 'http://127.0.0.1:4202';
  }
  return baseUrl.replace(/\/$/, '');
}

async function main() {
  const baseUrl = await detectBaseUrl();
  const headless = isHeadless();
  const bookUrl = `${baseUrl}/book/${TENANT_ID}`;
  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  console.log('Open', bookUrl);

  const apiRes = await fetch(`${baseUrl}/api/public/tenants/${TENANT_ID}`);
  if (!apiRes.ok) throw new Error(`GET /public/tenants/${TENANT_ID} → ${apiRes.status}`);
  const apiBody = await apiRes.json();
  const publicSlug = (apiBody.public_slug || '').trim();
  const menuRefs = publicSlug
    ? [`/public-menu/${publicSlug}`, `/public-menu/${TENANT_ID}`]
    : [`/public-menu/${TENANT_ID}`];

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 390, height: 844 },
  });
  const page = await browser.newPage();
  await page.goto(bookUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('[data-testid="public-guest-header"]', { timeout: 15000 });
  // #415: numeric /book/{id} may canonicalize to /{slug}/book
  await new Promise((r) => setTimeout(r, 800));

  const fails = [];

  // #411: text ink vs header wash must meet WCAG AA (~4.5:1)
  const contrast = await page.$eval('[data-testid="public-guest-header"]', (el) => {
    const parseRgb = (css) => {
      const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };
    const channel = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const lum = (rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
    const style = window.getComputedStyle(el);
    const bg = parseRgb(style.backgroundColor);
    const fg = parseRgb(style.color);
    if (!bg || !fg) return { ok: false, ratio: 0, ink: el.getAttribute('data-header-ink') };
    const L1 = lum(bg);
    const L2 = lum(fg);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return {
      ok: ratio >= 4.5,
      ratio: Math.round(ratio * 100) / 100,
      ink: el.getAttribute('data-header-ink'),
      bg: style.backgroundColor,
      fg: style.color,
    };
  });
  if (!contrast.ok) {
    fails.push(
      `guest header contrast ${contrast.ratio}:1 < 4.5 (ink=${contrast.ink}, bg=${contrast.bg}, fg=${contrast.fg})`,
    );
  } else {
    console.log(`Contrast OK: ${contrast.ratio}:1 (ink=${contrast.ink})`);
  }

  const menuHref = await page.$eval('[data-testid="public-guest-nav-menu"]', (el) => el.getAttribute('href'));
  const waitHref = await page.$eval('[data-testid="public-guest-nav-waitlist"]', (el) => el.getAttribute('href'));
  const delHref = await page.$eval('[data-testid="public-guest-nav-delivery"]', (el) => el.getAttribute('href'));

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 400));
  const sticky = await page.$eval('[data-testid="public-guest-header"]', (el) => {
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el.parentElement || el);
    return {
      top: r.top,
      visible: r.height > 0 && r.width > 0,
      hostSticky: style.position,
    };
  });

  if (!menuHref || !menuRefs.some((ref) => menuHref.includes(ref))) {
    fails.push(`menu href unexpected: ${menuHref}`);
  }
  if (!waitHref || !waitHref.includes(`/waitlist/${TENANT_ID}`)) {
    fails.push(`waitlist href unexpected: ${waitHref}`);
  }
  if (!delHref || !delHref.includes(`/delivery/${TENANT_ID}`)) {
    fails.push(`delivery href unexpected: ${delHref}`);
  }
  if (!sticky.visible) fails.push('header not visible after scroll');
  if (sticky.top > 8) fails.push(`header not stuck to top after scroll (top=${sticky.top})`);

  // #364: hero "Book a table" pill scrolls to the booking form
  const bookPath = publicSlug ? `/${publicSlug}/book` : `/book/${TENANT_ID}`;
  await page.goto(`${baseUrl}${bookPath}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('[data-testid="book-hero-cta"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="book-form"]', { timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 200));
  const formTopBefore = await page.$eval('[data-testid="book-form"]', (el) => el.getBoundingClientRect().top);
  await page.click('[data-testid="book-hero-cta"]');
  await page.waitForFunction(
    () => {
      const form = document.querySelector('[data-testid="book-form"]');
      if (!form) return false;
      const top = form.getBoundingClientRect().top;
      return top > 0 && top < 220;
    },
    { timeout: 5000 },
  ).catch(() => null);
  const formTopAfter = await page.$eval('[data-testid="book-form"]', (el) => el.getBoundingClientRect().top);
  if (!(formTopAfter > 0 && formTopAfter < 220)) {
    fails.push(
      `book hero CTA did not scroll form into view (before top=${formTopBefore}, after top=${formTopAfter})`,
    );
  }

  await page.click('[data-testid="public-guest-nav-menu"]');
  await page.waitForFunction(
    (refs) => refs.some((ref) => location.pathname.includes(ref)),
    { timeout: 10000 },
    menuRefs,
  );
  await page.waitForSelector('[data-testid="public-guest-header"]', { timeout: 10000 });

  await browser.close();

  if (fails.length) {
    console.error('FAIL:', fails.join('; '));
    process.exit(1);
  }
  console.log('OK: sticky guest header on /book (contrast AA), hero Book CTA scrolls to form, menu link resolves.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
