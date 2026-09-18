#!/usr/bin/env node
/**
 * Smoke: public booking accepts /{slug}/book and numeric /book/{id} (#415).
 *
 * Usage (from front/):
 *   BASE_URL=http://127.0.0.1:4202 npm run test:public-book-slug
 */
import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function resolveBase() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  for (const port of [4203, 4202, 4200]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'head',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok || res.status === 304) return `http://127.0.0.1:${port}`;
    } catch {
      /* try next */
    }
  }
  return 'http://127.0.0.1:4202';
}

async function main() {
  const BASE = await resolveBase();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: isHeadless(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  const apiRes = await fetch(`${BASE}/api/public/tenants/1`);
  if (!apiRes.ok) throw new Error(`GET /public/tenants/1 → ${apiRes.status}`);
  const apiBody = await apiRes.json();
  const slug = (apiBody.public_slug || '').trim();
  if (!slug) throw new Error('tenant 1 missing public_slug');
  console.log(`slug=${slug}`);

  await page.goto(`${BASE}/${slug}/book`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="public-guest-header"]');
  await page.waitForSelector('[data-testid="book-hero-cta"], #book-form, #book-form-card');
  const slugUrl = page.url();
  if (!slugUrl.includes(`/${slug}/book`)) {
    throw new Error(`expected /${slug}/book, got ${slugUrl}`);
  }
  console.log('PASS slug book URL loads');

  await page.goto(`${BASE}/book/1`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="public-guest-header"]');
  await new Promise((r) => setTimeout(r, 1000));
  const afterId = page.url();
  if (!afterId.includes(`/${slug}/book`) && !afterId.includes('/book/1')) {
    throw new Error(`unexpected URL after numeric open: ${afterId}`);
  }
  console.log(`PASS numeric /book/1 (url=${afterId})`);

  await browser.close();
  console.log('OK public-book slug smoke');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
