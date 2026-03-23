#!/usr/bin/env node
/**
 * Puppeteer test: public (unknown) user books a table — no login.
 * 1. Open /book/:tenantId
 * 2. Fill form and submit
 * 3. Assert success, then optionally open view page and cancel
 *
 * Usage (from front/): node scripts/debug-reservations-public.mjs
 * Optional env: BASE_URL, TENANT_ID (default 1), HEADLESS (default headless; 0/false/no = visible)
 * Chrome: /Applications/Google Chrome.app (macOS)
 */

import { isHeadless } from './puppeteer-headless.mjs';
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
    baseUrl = baseUrl || 'http://localhost:4202';
  }
  const tenantId = process.env.TENANT_ID || '1';
  const bookUrl = new URL(`/book/${tenantId}`, baseUrl).href;

  console.log('Launching Chrome at', CHROME_PATH);
  console.log('App URL:', baseUrl);
  console.log('Book URL (public, no login):', bookUrl);
  console.log('---');

  const headless = isHeadless();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const logs = [];
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    logs.push({ type, msg: text });
    console.log(`[${type}]`, text);
  });
  page.on('pageerror', (err) => {
    logs.push({ type: 'pageerror', msg: err.message });
    console.log('[pageerror]', err.message);
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    // 1. Go to public book page (no login)
    console.log('1. Navigating to public book page (no login)');
    await page.goto(bookUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    const urlAfterLoad = page.url();
    console.log('   URL after load:', urlAfterLoad);

    if (!urlAfterLoad.includes('/book/')) {
      console.log('\n>>> RESULT: Did not land on /book/:tenantId. Aborting.');
      await browser.close();
      process.exit(1);
    }

    const hasForm = await page.evaluate(() => !!document.querySelector('.book-form'));
    console.log('   Book form visible:', hasForm);
    if (!hasForm) {
      console.log('\n>>> RESULT: Book form not found.');
      await browser.close();
      process.exit(1);
    }

    // 2. Party size first (reloads week grid), then pick first free slot + contact fields
    const testName = 'Public User ' + Date.now();
    const partySize = 3;

    await page.evaluate(
      ({ partySize }) => {
        const form = document.querySelector('.book-form');
        if (!form) return;
        const partyIn = form.querySelector('input[name="partySize"]');
        if (!partyIn) return;
        partyIn.value = String(partySize);
        partyIn.dispatchEvent(new Event('input', { bubbles: true }));
        partyIn.dispatchEvent(new Event('change', { bubbles: true }));
      },
      { partySize }
    );
    await sleep(800);
    await page.waitForSelector('.book-week-grid .week-slot.ws-available:not([disabled])', {
      timeout: 15000,
    });

    const firstSlot = await page.$('.book-week-grid .week-slot.ws-available:not([disabled])');
    if (!firstSlot) {
      console.log('\n>>> RESULT: No available week slot found (grid empty or all full).');
      await browser.close();
      process.exit(1);
    }
    await firstSlot.click();
    await sleep(300);

    const picked = await page.evaluate(() => {
      const d = document.querySelector('.book-form input[name="date"]');
      const t = document.querySelector('.book-form input[name="time"]');
      return { date: d?.value || '', time: t?.value || '' };
    });
    console.log('2. Picked slot:', picked.date, picked.time, 'party:', partySize, testName);

    await page.evaluate(
      ({ name, phone }) => {
        const form = document.querySelector('.book-form');
        if (!form) return;
        const setAndDispatch = (el, value) => {
          if (!el) return;
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const nameIn = form.querySelector('input[name="name"]');
        const phoneIn = form.querySelector('input[name="phone"]');
        setAndDispatch(nameIn, name);
        setAndDispatch(phoneIn, phone);
      },
      {
        name: testName,
        phone: '+34987654321',
      }
    );
    await sleep(400);

    // 3. Submit
    console.log('3. Submitting booking');
    const submitBtn = await page.$('.book-form button[type="submit"]');
    if (!submitBtn) {
      console.log('   Submit button not found.');
      await browser.close();
      process.exit(1);
    }
    await submitBtn.click();
    await sleep(2500);

    const hasSuccess = await page.evaluate(() => {
      return (
        !!document.querySelector('.success-message') ||
        !!document.querySelector('.view-cancel-hint') ||
        !!document.querySelector('a[href*="reservation"]')
      );
    });
    const viewCancelHref = await page.evaluate(() => {
      const a = document.querySelector('a[href*="reservation"]');
      return a ? a.getAttribute('href') || '' : '';
    });

    console.log('   Booking success (success UI):', hasSuccess);
    console.log('   View/Cancel link:', viewCancelHref || '(none)');

    if (!hasSuccess) {
      const errText = await page.evaluate(() => {
        const el = document.querySelector('.form-error');
        return el ? el.textContent : '';
      });
      console.log('   Form error:', errText || '(none)');
      console.log('\n>>> RESULT: Public booking did not show success.');
      await browser.close();
      process.exit(1);
    }

    console.log('\n>>> RESULT: Public user successfully reserved a table.');

    // 4. Optional: open view page and cancel
    if (viewCancelHref && viewCancelHref.includes('token=')) {
      console.log('4. Opening reservation view (by token) and cancelling');
      const viewUrl = viewCancelHref.startsWith('http') ? viewCancelHref : new URL(viewCancelHref, baseUrl).href;
      await page.goto(viewUrl, { waitUntil: 'networkidle2', timeout: 10000 });
      await sleep(1500);

      const hasDetails = await page.evaluate(() => !!document.querySelector('.reservation-details'));
      const cancelBtn = await page.$('.btn-danger');
      if (hasDetails && cancelBtn) {
        await cancelBtn.click();
        await sleep(600);
        const confirmBtn = await page.$('app-confirmation-modal button[class*="danger"], .btn-danger');
        if (confirmBtn) {
          await confirmBtn.click();
          await sleep(1200);
          const showsCancelled = await page.evaluate(() => {
            const body = document.body?.innerText || '';
            return body.toLowerCase().includes('cancelled');
          });
          console.log('   View page showed details:', hasDetails);
          console.log('   Cancelled via token:', showsCancelled);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    console.log('\n--- Console / errors captured:', logs.length);
    await browser.close();
  }
}

main();
