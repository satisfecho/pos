#!/usr/bin/env node
/**
 * Debug script: launch Chrome via CDP, open the POS app, then navigate to
 * /reservations and capture console messages and errors to diagnose why the
 * Reservations screen does not open.
 *
 * Usage (from front/): node scripts/debug-reservations.mjs
 * Optional env: BASE_URL (default http://localhost:4202), LOGIN_EMAIL, LOGIN_PASSWORD
 *
 * Chrome must be installed at: /Applications/Google Chrome.app (macOS)
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
    baseUrl = baseUrl || 'http://localhost:4202';
  }
  const BASE_URL = baseUrl;
  console.log('Launching Chrome at', CHROME_PATH);
  console.log('App URL:', BASE_URL);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const logs = [];
  const collect = (type, args) => {
    const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logs.push({ type, msg });
    console.log(`[${type}]`, msg);
  };

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    collect(type, [text]);
  });

  page.on('pageerror', (err) => {
    collect('pageerror', [err.message + (err.stack || '')]);
  });

  try {
    console.log('1. Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('   URL after load:', page.url());

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const hasLogin = await page.evaluate(() => {
      return !!document.querySelector('input[type="email"], input[type="password"], a[href*="login"]');
    });
    if (hasLogin && process.env.LOGIN_EMAIL && process.env.LOGIN_PASSWORD) {
      console.log('2. Attempting login...');
      await page.type('input[type="email"]', process.env.LOGIN_EMAIL);
      await page.type('input[type="password"]', process.env.LOGIN_PASSWORD);
      const submit = await page.$('button[type="submit"], input[type="submit"]');
      if (submit) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
          submit.click(),
        ]);
      }
      await sleep(3000);
      console.log('   URL after login:', page.url());
    } else {
      console.log('2. Waiting 8s for you to log in manually in the opened window...');
      await sleep(8000);
      console.log('   Current URL:', page.url());
    }

    console.log('3. Navigating to /reservations');
    await sleep(1000);
    await page.goto(new URL('/reservations', BASE_URL).href, {
      waitUntil: 'networkidle2',
      timeout: 10000,
    }).catch((e) => {
      console.log('   Navigation error:', e.message);
    });
    await sleep(2500);
    const finalUrl = page.url();
    console.log('   Final URL:', finalUrl);

    const hasReservationContent = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const body = document.body?.innerText || '';
      return (
        (h1 && h1.textContent && h1.textContent.toLowerCase().includes('reservation')) ||
        body.toLowerCase().includes('reservation')
      );
    });
    console.log('   Page has reservation-related content:', hasReservationContent);

    if (!finalUrl.includes('reservations')) {
      console.log('\n>>> RESULT: Did not stay on /reservations. Redirect occurred (likely guard).');
    } else if (!hasReservationContent) {
      console.log('\n>>> RESULT: URL is /reservations but content may be missing (check for lazy-load error).');
    } else {
      console.log('\n>>> RESULT: Reservations page appears to have loaded.');
    }

    // 4. Create reservation
    const testName = 'Puppeteer Test ' + Date.now();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    console.log('4. Creating reservation:', testName, 'date:', dateStr);
    const newBtn = await page.$('.page-header .btn-primary');
    if (newBtn) {
      await newBtn.click();
      await sleep(800);
      const modal = await page.$('.modal-overlay .modal-content');
      if (modal) {
        await page.waitForSelector('.modal-body input[type="date"]', { timeout: 3000 }).catch(() => null);
        // Set form values via DOM so Angular binds correctly (avoids typing/format issues)
        await page.evaluate(
          ({ name, phone, dateVal, timeVal, partySize }) => {
            const inputs = document.querySelectorAll('.modal-body input');
            if (inputs.length >= 5) {
              const [nameIn, phoneIn, dateIn, timeIn, numIn] = inputs;
              const setAndDispatch = (el, value) => {
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              };
              setAndDispatch(nameIn, name);
              setAndDispatch(phoneIn, phone);
              setAndDispatch(dateIn, dateVal);
              setAndDispatch(timeIn, timeVal);
              setAndDispatch(numIn, String(partySize));
            }
          },
          {
            name: testName,
            phone: '+1555123456',
            dateVal: dateStr,
            timeVal: '19:00',
            partySize: 2,
          }
        );
        await sleep(300);
        const saveBtn = await page.$('.modal-footer .btn-primary');
        if (saveBtn) {
          await saveBtn.click();
          await sleep(1500);
          // List is filtered by date; set filter to created date so the new reservation appears
          await page.evaluate((dateVal) => {
            const dateFilter = document.querySelector('.filters input[type="date"]');
            if (dateFilter) {
              dateFilter.value = dateVal;
              dateFilter.dispatchEvent(new Event('input', { bubbles: true }));
              dateFilter.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, dateStr);
          await sleep(1200);
          const hasCard = await page.evaluate((name) => {
            return !!Array.from(document.querySelectorAll('.reservation-card')).find(
              (el) => el.innerText && el.innerText.includes(name)
            );
          }, testName);
          console.log('   Create: card visible after save:', hasCard);
          if (!hasCard) console.log('   (Check for form error or API failure in console above)');
        }
      } else {
        console.log('   Create: modal did not open');
      }
    } else {
      console.log('   Create: New button not found (no write permission?)');
    }

    // 5. Cancel reservation
    await sleep(500);
    console.log('5. Cancelling the created reservation');
    const cancelClicked = await page.evaluate((name) => {
      const cards = document.querySelectorAll('.reservation-card');
      for (const card of cards) {
        if (card.innerText && card.innerText.includes(name)) {
          const cancelBtn = card.querySelector('.card-actions button.danger');
          if (cancelBtn) {
            cancelBtn.click();
            return true;
          }
        }
      }
      return false;
    }, testName);
    if (cancelClicked) {
      await sleep(600);
      const confirmBtn = await page.$('app-confirmation-modal button[class*="danger"], .btn-danger');
      if (confirmBtn) {
        await confirmBtn.click();
        await sleep(1200);
        const stillBooked = await page.evaluate((name) => {
          const cards = document.querySelectorAll('.reservation-card.status-booked');
          return Array.from(cards).some((el) => el.innerText && el.innerText.includes(name));
        }, testName);
        const hasCancelled = await page.evaluate((name) => {
          const cards = document.querySelectorAll('.reservation-card.status-cancelled');
          return Array.from(cards).some((el) => el.innerText && el.innerText.includes(name));
        }, testName);
        console.log('   Cancel: confirmed, no longer booked:', !stillBooked, '| shows cancelled:', hasCancelled);
      } else {
        console.log('   Cancel: confirm modal button not found');
      }
    } else {
      console.log('   Cancel: card or Cancel button not found for', testName);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    console.log('\n--- Console / errors captured:', logs.length);
    await browser.close();
  }
}

main();
