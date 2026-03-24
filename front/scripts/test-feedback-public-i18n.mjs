#!/usr/bin/env node
/**
 * Puppeteer: public /feedback/:tenant uses translations (no raw FEEDBACK.* keys in DOM).
 * Switches to Deutsch and checks expected German copy + document title.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs
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
  const headless = isHeadless();
  console.log('BASE_URL:', baseUrl);
  console.log('Tenant:', tenantId);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    const url = new URL(`/feedback/${tenantId}`, baseUrl).href;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    await page.waitForSelector('.language-select', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || '';
        return t.length > 80 && !t.includes('FEEDBACK.');
      },
      { timeout: 15000 }
    );

    const beforeDe = await page.evaluate(() => document.body.innerText);
    if (beforeDe.includes('FEEDBACK.')) {
      throw new Error('Raw i18n keys visible in DOM (en): ' + beforeDe.slice(0, 400));
    }

    await page.select('.language-select', 'de');
    await sleep(600);

    await page.waitForFunction(
      () => (document.body?.innerText || '').includes('Wie war Ihr Besuch'),
      { timeout: 10000 }
    );

    const bodyDe = await page.evaluate(() => document.body.innerText);
    if (bodyDe.includes('FEEDBACK.')) {
      throw new Error('Raw i18n keys visible after switch to de');
    }

    const docTitle = await page.title();
    if (!docTitle.includes('Wie war')) {
      throw new Error(`Expected DE document title to include "Wie war", got: ${docTitle}`);
    }

    console.log('>>> RESULT: Public feedback i18n OK (en + de, no FEEDBACK.* leaks)');
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
