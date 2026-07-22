#!/usr/bin/env node
/**
 * Smoke: public Satisfecho Delivery checkout UI loads (menu → cart path).
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-checkout.mjs
 */
import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

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
  const url = `${BASE_URL}/delivery/${TENANT_ID}`;
  console.log('Open', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || '';
      return (
        t.includes('Delivery') ||
        t.includes('Lieferung') ||
        t.includes('Entrega') ||
        t.includes('Livraison') ||
        t.includes('Add') ||
        t.includes('Hinzufügen') ||
        t.includes('Añadir') ||
        !t.includes('Loading')
      );
    },
    { timeout: 30000 },
  );

  const text = await page.evaluate(() => document.body.innerText);
  if (/DELIVERY_CHECKOUT\./.test(text)) {
    throw new Error('Raw i18n keys visible on delivery page');
  }
  if (/Restaurant not found|Invalid restaurant|Tenant not found/i.test(text) && !/Add|cart|menu/i.test(text)) {
    console.warn('Tenant may be missing in this env; page still rendered error state OK');
  } else {
    const addBtn = await page.$('button.delivery-add-btn');
    if (addBtn) {
      await addBtn.click();
      await page.waitForSelector('button.delivery-cart-btn:not([disabled])', { timeout: 5000 });
      await page.click('button.delivery-cart-btn');
      await page.waitForFunction(
        () => (document.body?.innerText || '').length > 0,
        { timeout: 5000 },
      );
      const cartText = await page.evaluate(() => document.body.innerText);
      if (!/cart|Warenkorb|carrito|panier|Continue|Weiter|Continuar/i.test(cartText)) {
        throw new Error('Cart step did not appear after add');
      }
      console.log('Cart step OK');
    } else {
      console.log('No add buttons (empty menu); page shell OK');
    }
  }

  // Public menu CTA
  await page.goto(`${BASE_URL}/public-menu/${TENANT_ID}`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  const cta = await page.$('a[href*="/delivery/"]');
  if (!cta) {
    throw new Error('Missing Order delivery CTA on public-menu');
  }
  console.log('public-menu delivery CTA OK');
  console.log('PASS');
  await browser.close();
}

main().catch(async (err) => {
  console.error('FAIL', err);
  process.exitCode = 1;
});
