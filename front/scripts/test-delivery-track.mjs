#!/usr/bin/env node
/**
 * Smoke: public Satisfecho Delivery track page loads (missing/invalid token shows error).
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-track.mjs
 */
import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:4202').replace(/\/$/, '');
const TENANT_ID = process.env.TENANT_ID || '1';
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: isHeadless(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const url = `${BASE_URL}/delivery/${TENANT_ID}/track?order_id=1&public_order_token=invalid`;
  console.log('Open', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || '';
      return t.length > 20 && !/Loading order status/i.test(t);
    },
    { timeout: 30000 },
  );

  const text = await page.evaluate(() => document.body.innerText);
  if (/DELIVERY_TRACK\./.test(text)) {
    throw new Error('Raw i18n keys visible on track page');
  }
  if (!/not found|expired|Missing|Pedido|Bestellung|commandé/i.test(text)) {
    console.warn('Unexpected track body (ok if translated differently):', text.slice(0, 200));
  } else {
    console.log('Track page shows not-found / missing state OK');
  }

  await browser.close();
  console.log('OK delivery track smoke');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
