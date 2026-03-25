#!/usr/bin/env node
/**
 * Puppeteer: public /feedback/:tenant uses translations (no raw FEEDBACK.* keys in DOM).
 * Default locale, then de/fr/es/ca/zh-CN/hi; token URL; POST submit → thank-you (de); invalid /feedback/0;
 * missing tenant /feedback/999999999 (404); (#67).
 * Fresh profile + navigator.language stub es-ES before load (no pos_language): asserts initial UI
 * uses LanguageService browser detection (first visit; complements manual picker).
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

  const feedbackUrl = new URL(`/feedback/${tenantId}`, baseUrl).href;

  // No stored pos_language: LanguageService reads navigator.language on first load.
  // Stub before document loads (evaluateOnNewDocument); CDP/--lang alone did not flip navigator in this stack.
  const browserEsAuto = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const pageEsAuto = await browserEsAuto.newPage();
  await pageEsAuto.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', {
      get: () => 'es-ES',
      configurable: true,
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['es-ES', 'es', 'en'],
      configurable: true,
    });
  });
  try {
    await pageEsAuto.goto(feedbackUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    await pageEsAuto.waitForSelector('.language-select', { timeout: 15000 });
    await pageEsAuto.waitForFunction(
      () => {
        const t = document.body?.innerText || '';
        return t.includes('Cómo fue') && !t.includes('FEEDBACK.');
      },
      { timeout: 15000 }
    );
    const titleEsAuto = await pageEsAuto.title();
    if (!titleEsAuto.includes('Cómo')) {
      throw new Error(`Expected ES auto-detect document title to include "Cómo", got: ${titleEsAuto}`);
    }
    console.log(
      '>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)'
    );
  } finally {
    await browserEsAuto.close();
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    const url = feedbackUrl;
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

    const docTitleDe = await page.title();
    if (!docTitleDe.includes('Wie war')) {
      throw new Error(`Expected DE document title to include "Wie war", got: ${docTitleDe}`);
    }

    await page.select('.language-select', 'fr');
    await sleep(600);

    await page.waitForFunction(
      () => (document.body?.innerText || '').includes('Comment s'),
      { timeout: 10000 }
    );

    const bodyFr = await page.evaluate(() => document.body.innerText);
    if (bodyFr.includes('FEEDBACK.')) {
      throw new Error('Raw i18n keys visible after switch to fr');
    }

    const docTitleFr = await page.title();
    if (!docTitleFr.includes('Comment')) {
      throw new Error(`Expected FR document title to include "Comment", got: ${docTitleFr}`);
    }

    await page.select('.language-select', 'es');
    await sleep(600);

    await page.waitForFunction(
      () => (document.body?.innerText || '').includes('Cómo fue'),
      { timeout: 10000 }
    );

    const bodyEs = await page.evaluate(() => document.body.innerText);
    if (bodyEs.includes('FEEDBACK.')) {
      throw new Error('Raw i18n keys visible after switch to es');
    }

    const docTitleEs = await page.title();
    if (!docTitleEs.includes('Cómo')) {
      throw new Error(`Expected ES document title to include "Cómo", got: ${docTitleEs}`);
    }

    await page.select('.language-select', 'ca');
    await sleep(600);

    await page.waitForFunction(
      () => (document.body?.innerText || '').includes('Com ha anat'),
      { timeout: 10000 }
    );

    const bodyCa = await page.evaluate(() => document.body.innerText);
    if (bodyCa.includes('FEEDBACK.')) {
      throw new Error('Raw i18n keys visible after switch to ca');
    }

    const docTitleCa = await page.title();
    if (!docTitleCa.includes('Com ha anat')) {
      throw new Error(`Expected CA document title to include "Com ha anat", got: ${docTitleCa}`);
    }

    await page.select('.language-select', 'zh-CN');
    await sleep(600);

    await page.waitForFunction(
      () => (document.body?.innerText || '').includes('本次用餐'),
      { timeout: 10000 }
    );

    const bodyZh = await page.evaluate(() => document.body.innerText);
    if (bodyZh.includes('FEEDBACK.')) {
      throw new Error('Raw i18n keys visible after switch to zh-CN');
    }

    const docTitleZh = await page.title();
    if (!docTitleZh.includes('本次用餐')) {
      throw new Error(`Expected zh-CN document title to include Chinese prompt, got: ${docTitleZh}`);
    }

    await page.select('.language-select', 'hi');
    await sleep(600);

    await page.waitForFunction(
      () => (document.body?.innerText || '').includes('आपकी मुलाक़ात'),
      { timeout: 10000 }
    );

    const bodyHi = await page.evaluate(() => document.body.innerText);
    if (bodyHi.includes('FEEDBACK.')) {
      throw new Error('Raw i18n keys visible after switch to hi');
    }

    const docTitleHi = await page.title();
    if (!docTitleHi.includes('आपकी')) {
      throw new Error(`Expected HI document title to include Hindi prompt, got: ${docTitleHi}`);
    }

    console.log(
      '>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)'
    );

    // Token query (reservation deep link): same i18n expectations, no raw keys in DOM
    const urlWithToken = new URL(`/feedback/${tenantId}`, baseUrl);
    urlWithToken.searchParams.set('token', 'dummy-token-for-i18n-smoke');
    await page.goto(urlWithToken.href, { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('.language-select', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || '';
        return t.length > 80 && !t.includes('FEEDBACK.');
      },
      { timeout: 15000 }
    );
    const bodyToken = await page.evaluate(() => document.body.innerText);
    if (bodyToken.includes('FEEDBACK.')) {
      throw new Error('Raw i18n keys visible with ?token= (en): ' + bodyToken.slice(0, 400));
    }
    console.log('>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)');

    // Invalid reservation token on submit: API returns localized detail (Accept-Language); must not show raw keys (#67).
    const urlBadToken = new URL(`/feedback/${tenantId}`, baseUrl);
    urlBadToken.searchParams.set('token', 'bogus-reservation-token-i18n-check');
    await page.goto(urlBadToken.href, { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('.language-select', { timeout: 15000 });
    await page.waitForSelector('.star-row .star-btn', { timeout: 15000 });
    await page.select('.language-select', 'de');
    await sleep(600);
    const starBtnsBad = await page.$$('.star-row .star-btn');
    await starBtnsBad[4].click();
    await sleep(200);
    await page.click('button.btn-submit-feedback');
    await page.waitForFunction(
      () => {
        const errEl = document.querySelector('.form-error');
        const t = errEl?.textContent || '';
        return (
          t.includes('Ungültiger') &&
          t.includes('Reservierungslink') &&
          !(document.body?.innerText || '').includes('FEEDBACK.')
        );
      },
      { timeout: 15000 }
    );
    const titleBadTokenDe = await page.title();
    if (titleBadTokenDe.includes('FEEDBACK.')) {
      throw new Error(`Raw i18n key in document title after API error: ${titleBadTokenDe}`);
    }
    console.log('>>> RESULT: Submit with invalid ?token= shows DE API error (no FEEDBACK.* leaks)');

    // Full submit → thank-you: ensures FEEDBACK.THANK_YOU* and title stay localized (issue #67).
    await page.goto(feedbackUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('.language-select', { timeout: 15000 });
    await page.waitForSelector('.star-row .star-btn', { timeout: 15000 });
    await page.select('.language-select', 'de');
    await sleep(600);
    const starBtns = await page.$$('.star-row .star-btn');
    if (starBtns.length < 5) {
      throw new Error(`Expected 5 star buttons, got ${starBtns.length}`);
    }
    await starBtns[4].click();
    await sleep(200);
    await page.click('button.btn-submit-feedback');
    await page.waitForSelector('.book-success-card', { timeout: 20000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || '';
        return t.includes('Vielen Dank') && !t.includes('FEEDBACK.');
      },
      { timeout: 10000 }
    );
    const titleThankDe = await page.title();
    if (titleThankDe.includes('FEEDBACK.')) {
      throw new Error(`Raw i18n key in document title after submit: ${titleThankDe}`);
    }
    if (!titleThankDe.includes('Vielen')) {
      throw new Error(`Expected DE thank-you tab title to include "Vielen", got: ${titleThankDe}`);
    }
    console.log('>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)');

    // Invalid tenant id: error state must be translated (issue #67).
    // Prior steps leave a non-en locale in localStorage; assert EN copy explicitly.
    await page.select('.language-select', 'en');
    await sleep(600);

    const urlInvalid = new URL('/feedback/0', baseUrl).href;
    await page.goto(urlInvalid, { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('.language-select', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || '';
        return t.includes('Invalid restaurant') && !t.includes('FEEDBACK.');
      },
      { timeout: 15000 }
    );
    await page.select('.language-select', 'de');
    await sleep(600);
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || '';
        return t.includes('Ungültiger Restaurant') && !t.includes('FEEDBACK.');
      },
      { timeout: 10000 }
    );
    const titleInvalidDe = await page.title();
    if (!titleInvalidDe.includes('Ungültiger')) {
      throw new Error(`Expected DE document title for invalid tenant, got: ${titleInvalidDe}`);
    }
    console.log('>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK');

    // Missing tenant (API 404): FEEDBACK.TENANT_NOT_FOUND must be translated (issue #67).
    const urlMissing = new URL('/feedback/999999999', baseUrl).href;
    await page.goto(urlMissing, { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('.language-select', { timeout: 15000 });
    await page.select('.language-select', 'en');
    await sleep(600);
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || '';
        return t.includes('Restaurant not found') && !t.includes('FEEDBACK.');
      },
      { timeout: 15000 }
    );
    await page.select('.language-select', 'de');
    await sleep(600);
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || '';
        return t.includes('Restaurant nicht gefunden') && !t.includes('FEEDBACK.');
      },
      { timeout: 10000 }
    );
    const titleMissingDe = await page.title();
    if (!titleMissingDe.includes('nicht gefunden')) {
      throw new Error(`Expected DE document title for missing tenant, got: ${titleMissingDe}`);
    }
    console.log('>>> RESULT: Missing tenant (404) error UI i18n OK');
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
