#!/usr/bin/env node
/**
 * Smoke: public careers page with email verification (#447 / #448).
 * Expects careers enabled for TENANT_ID (default 1). If API returns 404 disabled,
 * script exits 0 with a skip note unless REQUIRE_ENABLED=1.
 *
 * When SMTP is not configured (local), request-code returns dev_code (non-production).
 * Optional: CAREERS_FIXED_CODE / OWNER_SIGNUP_FIXED_CODE if the server uses a fixed code.
 *
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-careers-public.mjs
 */
import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((p) => {
    try {
      require('fs').accessSync(p);
      return true;
    } catch {
      return false;
    }
  }) ||
  '/usr/bin/google-chrome';

async function resolveBase() {
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
  }
  return baseUrl || 'http://127.0.0.1:4202';
}

async function main() {
  const baseUrl = await resolveBase();
  const tenantId = process.env.TENANT_ID || '1';
  const requireEnabled = process.env.REQUIRE_ENABLED === '1';
  const fixedCode = (
    process.env.CAREERS_FIXED_CODE ||
    process.env.OWNER_SIGNUP_FIXED_CODE ||
    ''
  ).trim();
  console.log('BASE_URL:', baseUrl, 'TENANT_ID:', tenantId);

  const api = await fetch(`${baseUrl}/api/public/tenants/${tenantId}/careers`);
  if (api.status === 404) {
    const detail = await api.json().catch(() => ({}));
    console.log('Careers API 404 (disabled or missing):', detail?.detail?.code || detail);
    if (requireEnabled) {
      console.error('REQUIRE_ENABLED=1 but careers not enabled');
      process.exit(1);
    }
    console.log('SKIP: enable careers in Settings to exercise the form.');
    process.exit(0);
  }
  if (!api.ok) {
    console.error('Careers API failed', api.status);
    process.exit(1);
  }
  const info = await api.json();
  console.log('Careers enabled, retention_days=', info.retention_days);

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || CHROME_PATH,
    headless: isHeadless(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(new URL(`/careers/${tenantId}`, baseUrl).href, {
    waitUntil: 'networkidle2',
    timeout: 20000,
  });
  const form = await page.$('[data-testid="careers-form"]');
  if (!form) {
    console.error('Careers form not found');
    await browser.close();
    process.exit(1);
  }
  const stamp = Date.now();
  const email = `careers.smoke.${stamp}@amvara.de`;
  await page.type('input[name="name"]', `Test Candidate ${stamp}`);
  await page.type('input[name="email"]', email);
  await page.type('input[name="phone"]', '+34911000111');
  await page.type('textarea[name="message"]', 'Smoke test application');

  let capturedDevCode = null;
  page.on('response', async (res) => {
    try {
      if (!res.url().includes('/careers/applications/request-code')) return;
      if (!res.ok()) return;
      const body = await res.json();
      if (body?.dev_code) capturedDevCode = String(body.dev_code);
    } catch (_) {}
  });

  await page.click('[data-testid="careers-request-code"]');
  await page.waitForSelector('[data-testid="careers-verify-form"]', { timeout: 15000 });

  let code = fixedCode;
  if (!code) {
    // Wait briefly for response handler
    for (let i = 0; i < 20 && !capturedDevCode; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    code = capturedDevCode;
  }
  if (!code) {
    const hint = await page.$('[data-testid="careers-dev-code"]');
    if (hint) {
      const text = await page.evaluate((el) => el.textContent || '', hint);
      const m = text.match(/(\d{6})/);
      if (m) code = m[1];
    }
  }
  if (!code) {
    console.error(
      'FAIL: no verification code. Set CAREERS_FIXED_CODE=424242 on the server, ' +
        'or ensure non-prod request-code returns dev_code when SMTP is off.',
    );
    await browser.close();
    process.exit(1);
  }
  console.log('Using verification code (fixed or dev_code)');

  await page.type('[data-testid="careers-verify-code"]', code);
  await page.click('[data-testid="careers-submit"]');
  await page.waitForSelector('[data-testid="careers-thank-you"]', { timeout: 20000 });
  console.log('OK: application submitted after email code, thank-you shown');
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
