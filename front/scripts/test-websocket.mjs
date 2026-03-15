#!/usr/bin/env node
/**
 * Test WebSocket connectivity after owner login.
 * Logs in as demo restaurant owner, navigates to /orders, and checks
 * that the tenant WebSocket connects (no 403/503/1008).
 *
 * Usage (from project root):
 *   node front/scripts/test-websocket.mjs
 *
 * For WebSocket to pass, use the full stack (HAProxy on 4202):
 *   docker compose up -d
 *   docker compose build ws-bridge && docker compose up -d ws-bridge   # if image is old
 *   BASE_URL=http://localhost:4202 node front/scripts/test-websocket.mjs
 *
 * Env: BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD (or DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD).
 * Loads .env from project root or current dir if vars unset.
 *
 * Chrome: PUPPETEER_EXECUTABLE_PATH or /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [
    resolve(__dirname, '../../.env'),
    resolve(process.cwd(), '.env'),
    resolve(__dirname, '../.env'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf8');
        content.split('\n').forEach((line) => {
          const m = line.match(/^([^#=]+)=(.*)$/);
          if (m) {
            const key = m[1].trim();
            const val = m[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) process.env[key] = val;
          }
        });
        return;
      } catch (_) {}
    }
  }
}

loadEnv();

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LOGIN_EMAIL = process.env.LOGIN_EMAIL || process.env.DEMO_OWNER_EMAIL || process.env.DEMO_LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || process.env.DEMO_OWNER_PASSWORD || process.env.DEMO_LOGIN_PASSWORD;

async function main() {
  let baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    for (const port of [4202, 4203, 4200]) {
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
  console.log('App URL:', BASE_URL);
  console.log('Login:', LOGIN_EMAIL ? `${LOGIN_EMAIL} (from env)` : 'NOT SET – set LOGIN_EMAIL and LOGIN_PASSWORD or DEMO_OWNER_EMAIL / DEMO_OWNER_PASSWORD');
  console.log('---');

  const headless = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true';
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const logs = [];
  const collect = (type, args) => {
    const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logs.push({ type, msg });
    console.log(`[${type}]`, msg);
  };
  page.on('console', (msg) => collect(msg.type(), [msg.text()]));
  page.on('pageerror', (err) => collect('pageerror', [err.message]));

  let wsOpened = false;
  let wsAuthError = false;
  let ws403 = false;
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('WebSocket connection opened successfully')) wsOpened = true;
    if (text.includes('Invalid authentication token') || text.includes('Missing authentication token') || (text.includes('code=1008') && text.includes('authentication'))) wsAuthError = true;
    if (text.includes('Unexpected response code: 403') && text.includes('WebSocket')) ws403 = true;
  });

  try {
    console.log('1. Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 15000 });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    if (LOGIN_EMAIL && LOGIN_PASSWORD) {
      console.log('2. Logging in...');
      const emailSel = 'input[type="email"], input[name="username"]';
      const passSel = 'input[type="password"]';
      await page.waitForSelector(emailSel, { timeout: 5000 }).catch(() => null);
      if (await page.$(emailSel)) {
        await page.type(emailSel, LOGIN_EMAIL);
        await page.type(passSel, LOGIN_PASSWORD);
        const submit = await page.$('button[type="submit"], input[type="submit"]');
        if (submit) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
            submit.click(),
          ]);
        }
        await sleep(3000);
      }
    } else {
      console.log('2. No credentials – waiting 10s for manual login...');
      await sleep(10000);
    }

    console.log('3. Navigating to /orders (triggers tenant WebSocket)');
    await page.goto(new URL('/orders', BASE_URL).href, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await sleep(6000);

    if (wsOpened) {
      console.log('\n>>> RESULT: WebSocket connection opened successfully.');
    } else if (ws403) {
      console.log('\n>>> RESULT: WebSocket handshake returned 403 (request not proxied to ws-bridge).');
      console.log('    Fix: use full stack (HAProxy on 4202) and run test with BASE_URL=http://localhost:4202');
      console.log('    Or: use ng serve with proxy (proxyConfig in angular.json) and ensure HAProxy is running on 4202.');
    } else if (wsAuthError) {
      console.log('\n>>> RESULT: WebSocket auth failed (1008 / Invalid or Missing token).');
      console.log('    Fix: ensure backend and ws-bridge use the same SECRET_KEY and frontend uses token in WS URL.');
    } else {
      console.log('\n>>> RESULT: No WebSocket open or auth error seen in console. Check logs above.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
