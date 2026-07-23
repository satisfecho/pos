#!/usr/bin/env node
/**
 * Puppeteer smoke: SaaS signup hard paywall (#296 / docs/0052-saas-signup-paywall.md).
 *
 * When SAAS_PAYWALL_ENABLED=true:
 *   register a non-grandfathered tenant → login → /paywall → Start free trial → staff unlocks.
 * When paywall is off (local default): skip with exit 0 and a clear message.
 *
 * Usage (from repo root or front/):
 *   BASE_URL=http://127.0.0.1:4202 npm run test:paywall --prefix front
 *   REQUIRE_PAYWALL=1 BASE_URL=http://127.0.0.1:4202 node front/scripts/test-paywall.mjs
 *
 * Env:
 *   BASE_URL           App URL (default: auto-detect 4203, 4202, 4200)
 *   REQUIRE_PAYWALL    Set 1/true to fail (exit 1) when paywall is disabled instead of skip
 *   REGISTER_EMAIL     Optional; default test-paywall-<ts>@amvara.de
 *   REGISTER_PASSWORD  Default: testpass123
 *   HEADLESS           Default headless; set 0/false/no for a visible browser
 *
 * Enable for local runs (do not leave on for demo workflows):
 *   Set SAAS_PAYWALL_ENABLED=true in config.env, then recreate `back` with env-file:
 *   docker compose --env-file config.env -f docker-compose.yml -f docker-compose.dev.yml up -d back
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

function truthy(v) {
  const s = String(v || '').toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

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

async function fetchSaasConfig(baseUrl) {
  const res = await fetch(`${baseUrl}/api/saas/config`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`GET /api/saas/config failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function registerTenant(baseUrl, { tenantName, email, password, fullName, address, phone }) {
  const params = new URLSearchParams({
    tenant_name: tenantName,
    email,
    password,
    full_name: fullName,
    address,
    phone,
  });
  const res = await fetch(`${baseUrl}/api/register?${params}`, {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST /api/register failed: ${res.status} ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { status: 'created', raw: text };
  }
}

async function main() {
  const baseUrl = await detectBaseUrl();
  const requirePaywall = truthy(process.env.REQUIRE_PAYWALL);
  const headless = isHeadless();
  const stamp = Date.now();
  const email = process.env.REGISTER_EMAIL || `test-paywall-${stamp}@amvara.de`;
  const password = process.env.REGISTER_PASSWORD || 'testpass123';
  const fullName = process.env.REGISTER_FULL_NAME || 'Paywall Smoke';
  const tenantName = process.env.REGISTER_TENANT_NAME || `Paywall Smoke ${stamp}`;
  const address = process.env.REGISTER_ADDRESS || 'Teststrasse 1, 10115 Berlin';
  const phone = process.env.REGISTER_PHONE || '+491701234567';

  console.log('BASE_URL:', baseUrl);
  console.log('Headless:', headless);
  console.log('REQUIRE_PAYWALL:', requirePaywall);
  console.log('---');

  let config;
  try {
    config = await fetchSaasConfig(baseUrl);
  } catch (err) {
    console.error('FAIL: could not read SaaS config:', err.message);
    process.exit(1);
  }

  console.log('GET /api/saas/config:', JSON.stringify(config));
  if (!config.enabled) {
    const msg =
      'SKIP: SAAS_PAYWALL_ENABLED is false. Set SAAS_PAYWALL_ENABLED=true in config.env, then: ' +
      'docker compose --env-file config.env -f docker-compose.yml -f docker-compose.dev.yml up -d back. ' +
      'See docs/0052-saas-signup-paywall.md and docs/testing.md.';
    console.log(msg);
    if (requirePaywall) {
      console.error('FAIL: REQUIRE_PAYWALL=1 but paywall is disabled.');
      process.exit(1);
    }
    process.exit(0);
  }

  console.log('1. Registering non-grandfathered tenant via API…');
  console.log('   Email:', email);
  const created = await registerTenant(baseUrl, {
    tenantName,
    email,
    password,
    fullName,
    address,
    phone,
  });
  console.log('   Registered tenant_id:', created.tenant_id ?? '(unknown)');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[browser error]', msg.text());
  });
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  try {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });

    console.log('2. Login at /login…');
    await page.goto(new URL('/login', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await page.waitForSelector('input#email', { timeout: 10000 });
    await page.type('input#email', email);
    await page.type('input#password', password);
    await page.click('button[type="submit"].btn-submit');

    await page.waitForFunction(
      () => {
        const path = location.pathname;
        return path.includes('/paywall') || path.includes('/dashboard') || path.includes('/signup');
      },
      { timeout: 20000 },
    );
    await sleep(500);

    let url = page.url();
    console.log('   URL after login:', url);
    if (!url.includes('/paywall')) {
      throw new Error(`Expected redirect to /paywall after login; got ${url}`);
    }

    console.log('3. Asserting paywall UI (no raw PAYWALL.* keys)…');
    await page.waitForSelector('[data-testid="paywall-page"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="paywall-start-trial"]', { timeout: 15000 });

    const ui = await page.evaluate(() => {
      const body = (document.body?.innerText || '').trim();
      return {
        body,
        hasRawKeys: /PAYWALL\.[A-Z0-9_]+/.test(body),
        titleOk: /Choose a plan to continue/i.test(body),
        trialBtn: (document.querySelector('[data-testid="paywall-start-trial"]')?.textContent || '').trim(),
      };
    });
    if (ui.hasRawKeys) {
      throw new Error('Raw PAYWALL.* i18n keys visible on /paywall');
    }
    if (!ui.titleOk) {
      throw new Error(`Paywall title not localized as expected. Body snippet: ${ui.body.slice(0, 200)}`);
    }
    if (!/free trial/i.test(ui.trialBtn)) {
      throw new Error(`Start-trial button text unexpected: "${ui.trialBtn}"`);
    }
    console.log('   Paywall copy OK:', ui.trialBtn);

    console.log('4. Click Start free trial…');
    await page.click('[data-testid="paywall-start-trial"]');
    await page.waitForFunction(
      () => {
        const path = location.pathname;
        if (path.includes('/dashboard')) return true;
        return !!document.querySelector('[data-testid="paywall-unlocked"]');
      },
      { timeout: 20000 },
    );
    await sleep(800);
    url = page.url();
    console.log('   URL after trial:', url);

    if (url.includes('/paywall')) {
      const unlocked = await page.$('[data-testid="paywall-unlocked"]');
      if (!unlocked) {
        throw new Error('Still on /paywall without unlocked state after start-trial');
      }
      console.log('5. Unlocked on paywall; opening dashboard…');
      await page.click('a.btn-link, a[href="/dashboard"]');
      await page.waitForFunction(() => location.pathname.includes('/dashboard'), {
        timeout: 15000,
      });
      url = page.url();
    }

    if (!url.includes('/dashboard')) {
      throw new Error(`Expected /dashboard after trial; got ${url}`);
    }

    // Confirm staff route stays unlocked (authGuard + subscription)
    await page.goto(new URL('/dashboard', baseUrl).href, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await sleep(500);
    url = page.url();
    if (url.includes('/paywall')) {
      throw new Error('Dashboard redirected back to /paywall after trial (access not unlocked)');
    }
    if (!url.includes('/dashboard')) {
      throw new Error(`Unexpected URL after dashboard navigation: ${url}`);
    }

    console.log('\n>>> RESULT: Paywall smoke OK (register → /paywall → trial → dashboard).');
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message || err);
  process.exit(1);
});
