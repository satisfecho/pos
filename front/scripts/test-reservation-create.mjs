#!/usr/bin/env node
/**
 * Puppeteer test: create one public reservation (with email) for deploy verification.
 * Use after deploying backend to amvara9 to trigger a reservation and check that
 * confirmation email is queued (see backend logs: "Reservation confirmation email sent"
 * or "Reservation confirmation skipped: ... has no SMTP configured").
 *
 * Usage (from repo root or front/):
 *   node front/scripts/test-reservation-create.mjs
 *   BASE_URL=https://www.satisfecho.de HEADLESS=1 node front/scripts/test-reservation-create.mjs
 *
 * Env:
 *   BASE_URL   Default: https://www.satisfecho.de (amvara9). For local: auto-detect 4203/4202/4200.
 *   TENANT_ID  Tenant for /book/:id (default 1)
 *   TEST_EMAIL Customer email for the reservation (default ralf.roeber@amvara.de so confirmations can be verified).
 *   HEADLESS   Set to 1 to run headless
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function resolveBaseUrl() {
  const envUrl = process.env.BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  for (const port of [4203, 4202, 4200]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'head',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok || res.status < 500) return `http://127.0.0.1:${port}`;
    } catch (_) {}
  }
  return 'https://www.satisfecho.de';
}

async function main() {
  const baseUrl = await resolveBaseUrl();
  const tenantId = process.env.TENANT_ID || '1';
  const bookUrl = new URL(`/book/${tenantId}`, baseUrl).href;
  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';

  console.log('test-reservation-create (Puppeteer)');
  console.log('BASE_URL:', baseUrl);
  console.log('Book URL:', bookUrl);
  console.log('Headless:', headless);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    console.log('1. Open public book page');
    await page.goto(bookUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    const urlAfterLoad = page.url();
    if (!urlAfterLoad.includes('/book/')) {
      console.error('FAIL: Did not land on /book/:tenantId. URL:', urlAfterLoad);
      await browser.close();
      process.exit(1);
    }

    await page.waitForSelector('.book-form input[name="date"]', { timeout: 8000 }).catch(() => null);
    const hasForm = await page.evaluate(() => !!document.querySelector('.book-form'));
    if (!hasForm) {
      console.error('FAIL: Book form not found.');
      await browser.close();
      process.exit(1);
    }
    console.log('   Form visible');

    const testName = 'Test User ' + Date.now();
    const testEmail = process.env.TEST_EMAIL || 'ralf.roeber@amvara.de';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const timeVal = '20:00';
    const partySize = 2;

    console.log('2. Fill form (name, phone, email, date, time, party)');
    await page.evaluate(
      ({ name, phone, email, dateVal, timeVal, partySize }) => {
        const form = document.querySelector('.book-form');
        if (!form) return;
        const setAndDispatch = (el, value) => {
          if (!el) return;
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const dateIn = form.querySelector('input[name="date"]');
        const timeSelect = form.querySelector('select[name="time"]');
        const partyIn = form.querySelector('input[name="partySize"]');
        const nameIn = form.querySelector('input[name="name"]');
        const phoneIn = form.querySelector('input[name="phone"]');
        const emailIn = form.querySelector('input[name="email"], #book-email');
        setAndDispatch(dateIn, dateVal);
        if (timeSelect) {
          timeSelect.value = timeVal;
          timeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setAndDispatch(partyIn, String(partySize));
        setAndDispatch(nameIn, name);
        setAndDispatch(phoneIn, phone);
        if (emailIn) setAndDispatch(emailIn, email);
      },
      { name: testName, phone: '+34987654321', email: testEmail, dateVal: dateStr, timeVal, partySize }
    );
    await sleep(500);

    console.log('3. Submit booking');
    const submitBtn = await page.$('.book-form button[type="submit"]');
    if (!submitBtn) {
      console.error('FAIL: Submit button not found.');
      await browser.close();
      process.exit(1);
    }
    await submitBtn.click();
    await sleep(3500);

    const hasSuccess = await page.evaluate(() => {
      return (
        !!document.querySelector('.success-message') ||
        !!document.querySelector('.view-cancel-hint') ||
        !!document.querySelector('.book-success-card')
      );
    });

    const reservationId = await page.evaluate(() => {
      const el = document.querySelector('.reservation-details');
      if (!el) return null;
      const text = el.innerText || '';
      const m = text.match(/#(\d+)/);
      return m ? m[1] : null;
    });
    const viewCancelHref = await page.evaluate(() => {
      const a = document.querySelector('a[href*="reservation"]');
      return a ? a.getAttribute('href') || '' : '';
    });
    const testEmailUsed = testEmail;

    if (!hasSuccess) {
      const errText = await page.evaluate(() => {
        const el = document.querySelector('.form-error');
        return el ? el.textContent : '';
      });
      console.error('FAIL: Booking did not show success. Form error:', errText || '(none)');
      await browser.close();
      process.exit(1);
    }

    console.log('   Success');
    console.log('   Reservation #:', reservationId || '(not found in DOM)');
    console.log('   Customer email (confirmation will be sent if SMTP configured):', testEmailUsed);
    console.log('   View/Cancel link:', viewCancelHref ? 'yes' : 'no');
    console.log('');
    console.log('PASS: Test reservation created. If tenant has SMTP configured, a confirmation');
    console.log('      email should be sent. Check backend logs on amvara9 for:');
    console.log('      "Reservation confirmation email sent" or "Reservation confirmation skipped".');
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }

  await browser.close();
}

main();
