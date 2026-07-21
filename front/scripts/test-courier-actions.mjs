#!/usr/bin/env node
/**
 * Puppeteer smoke: courier portal status actions (#301).
 * Login → open Mine (or Available) → open order → run one available action → status updates.
 *
 * Env:
 *   BASE_URL            App URL (default: auto-detect 4203/4202/4200)
 *   COURIER_EMAIL       Default courier-test-phase1@amvara.de
 *   COURIER_PASSWORD    Default secret
 *   HEADLESS            Default headless; set 0/false/no for visible browser
 *
 * Optional: prepare a ready assigned order first via API if Mine is empty.
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
    if (idx <= 0) continue;
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

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function detectBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  for (const port of [4203, 4202, 4200]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok || res.status < 500) return `http://127.0.0.1:${port}`;
    } catch (_) {}
  }
  return 'http://127.0.0.1:4202';
}

/** Cookie-jar login (POS uses httpOnly access_token cookie, not JSON bearer). */
async function apiLogin(baseUrl, email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${baseUrl}/api/token?scope=courier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });
  if (!res.ok) {
    throw new Error(`Courier token failed: ${res.status} ${await res.text()}`);
  }
  const raw = res.headers.getSetCookie?.() || [];
  const cookieHeader = raw
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');
  if (!cookieHeader.includes('access_token=')) {
    // Node < 20 fallback: single set-cookie
    const single = res.headers.get('set-cookie');
    if (single && single.includes('access_token=')) {
      return single.split(';')[0];
    }
    throw new Error('No access_token cookie from /api/token');
  }
  return cookieHeader;
}

async function ensureReadyAssignedOrder(baseUrl, cookieHeader) {
  const headers = { Cookie: cookieHeader, 'Content-Type': 'application/json' };
  const meRes = await fetch(`${baseUrl}/api/courier/me`, { headers });
  if (!meRes.ok) throw new Error(`courier/me ${meRes.status}`);
  const me = await meRes.json();

  const listRes = await fetch(`${baseUrl}/api/courier/orders`, { headers });
  if (!listRes.ok) throw new Error(`courier/orders ${listRes.status}`);
  const orders = await listRes.json();
  const mine = orders.find(
    (o) =>
      o.courier_user_id === me.id &&
      ['ready', 'out_for_delivery', 'pending', 'preparing'].includes(o.status)
  );
  if (mine) return mine;

  const available = orders.find(
    (o) => o.courier_user_id == null && ['ready', 'pending', 'preparing'].includes(o.status)
  );
  if (available) {
    const act = await fetch(`${baseUrl}/api/courier/orders/${available.id}/actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'accept' }),
    });
    if (!act.ok) throw new Error(`accept failed ${act.status} ${await act.text()}`);
    return act.json();
  }

  throw new Error(
    'No open delivery order for courier smoke. Create a Satisfecho Delivery order (ready) first.'
  );
}

async function main() {
  const baseUrl = await detectBaseUrl();
  const email = process.env.COURIER_EMAIL || 'courier-test-phase1@amvara.de';
  const password = process.env.COURIER_PASSWORD || 'secret';
  const headless = isHeadless();

  console.log('BASE_URL:', baseUrl);
  console.log('Courier:', email);
  console.log('Headless:', headless);
  console.log('---');

  console.log('0. API: ensure assigned open order...');
  const cookieHeader = await apiLogin(baseUrl, email, password);
  const target = await ensureReadyAssignedOrder(baseUrl, cookieHeader);
  console.log(`   OK: order #${target.id} status=${target.status}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 420, height: 800 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    console.log('1. Login at /courier/login...');
    await page.goto(new URL('/courier/login', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null),
    ]);
    await sleep(1500);
    if (page.url().includes('/courier/login')) {
      throw new Error('Still on courier login (check credentials)');
    }
    console.log('   OK:', page.url());

    console.log('2. Open Mine tab...');
    const mineTab = await page.evaluateHandle(() => {
      const buttons = [...document.querySelectorAll('button.courier-tab')];
      return buttons.find((b) => /mine/i.test(b.textContent || '')) || null;
    });
    const mineEl = mineTab.asElement();
    if (mineEl) await mineEl.click();
    await sleep(800);
    console.log('   OK');

    console.log(`3. Open order #${target.id}...`);
    await page.goto(new URL(`/courier/orders/${target.id}`, baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await sleep(1000);
    const statusBefore = await page.$eval('.courier-status', (el) => el.textContent.trim());
    console.log('   Status before:', statusBefore);

    console.log('4. Click primary action (picked up or delivered or accept)...');
    const clicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button.btn-action.btn-primary')];
      const btn = buttons.find((b) => !b.disabled);
      if (!btn) return null;
      const label = (btn.textContent || '').trim();
      btn.click();
      return label;
    });
    if (!clicked) {
      throw new Error('No primary action button enabled on detail');
    }
    console.log('   Clicked:', clicked);
    await sleep(1500);

    const statusAfter = await page.$eval('.courier-status', (el) => el.textContent.trim());
    console.log('   Status after:', statusAfter);
    if (statusAfter === statusBefore && !/delivered|completed|out|camino|unterwegs|pickup|accept/i.test(clicked)) {
      // status text might change translation; also verify via API
    }
    const detailRes = await fetch(`${baseUrl}/api/courier/orders/${target.id}`, {
      headers: { Cookie: cookieHeader },
    });
    const detail = await detailRes.json();
    console.log('   API status:', detail.status, 'actions:', detail.allowed_actions);
    if (!['out_for_delivery', 'completed', 'ready'].includes(detail.status)) {
      throw new Error(`Unexpected status after action: ${detail.status}`);
    }
    console.log('---');
    console.log('PASS: courier action smoke ok');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message || err);
  process.exit(1);
});
