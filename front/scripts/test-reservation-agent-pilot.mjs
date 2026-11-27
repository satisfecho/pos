#!/usr/bin/env node
/**
 * Smoke + screenshot harness for LiveKit reservation-agent pilot (#457).
 *
 * Always verifies the public status API and the pilot HTML page (gated off when
 * LIVEKIT_* / allowlist are unset). Optional full session mint when the API
 * reports enabled=true (requires LiveKit credentials on the back container).
 *
 * Usage (from repo root):
 *   BASE_URL=http://127.0.0.1:14202 npm run test:reservation-agent-pilot --prefix front
 *
 * Env:
 *   BASE_URL      App URL (default: auto-detect 14202, 4203, 4202, 4200)
 *   TENANT_ID     Default 1
 *   HEADLESS      Default headless; set 0 / false / no for visible Chrome
 *   REQUIRE_ENABLED=1  Fail if status.enabled is false (full pilot env required)
 *   SCREENSHOT_DIR     Default docs/screenshots
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
import { existsSync, mkdirSync, accessSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function resolveChrome() {
  for (const p of CHROME_CANDIDATES) {
    try {
      accessSync(p);
      return p;
    } catch (_) {}
  }
  return CHROME_CANDIDATES[CHROME_CANDIDATES.length - 1];
}

async function resolveBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  for (const port of [14202, 4203, 4202, 4200]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'head',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok || res.status < 500) return `http://127.0.0.1:${port}`;
    } catch (_) {}
  }
  return 'http://127.0.0.1:4202';
}

async function main() {
  const baseUrl = await resolveBaseUrl();
  const tenantId = process.env.TENANT_ID || '1';
  const requireEnabled = process.env.REQUIRE_ENABLED === '1';
  const screenshotDir =
    process.env.SCREENSHOT_DIR || join(repoRoot, 'docs', 'screenshots');
  mkdirSync(screenshotDir, { recursive: true });

  console.log('test-reservation-agent-pilot');
  console.log('BASE_URL:', baseUrl);
  console.log('TENANT_ID:', tenantId);
  console.log('---');

  const statusUrl = `${baseUrl}/api/public/tenants/${tenantId}/reservation-agent`;
  const statusRes = await fetch(statusUrl);
  if (!statusRes.ok) {
    console.error('Status API failed', statusRes.status);
    process.exit(1);
  }
  const status = await statusRes.json();
  console.log('Status API:', JSON.stringify(status));

  if (requireEnabled && !status.enabled) {
    console.error('REQUIRE_ENABLED=1 but reservation agent is disabled');
    process.exit(1);
  }

  if (!status.enabled) {
    console.log(
      'Gated check OK: enabled=false (no LIVEKIT_* / allowlist on back). Full join needs credentials.',
    );
  } else {
    const sessionRes = await fetch(
      `${baseUrl}/api/public/tenants/${tenantId}/reservation-agent/session`,
      { method: 'POST' },
    );
    const sessionBody = await sessionRes.json().catch(() => ({}));
    console.log('Session mint:', sessionRes.status, {
      room_name: sessionBody.room_name,
      has_token: !!sessionBody.token,
      url: sessionBody.url ? '(set)' : '(missing)',
    });
    if (!sessionRes.ok || !sessionBody.token || !sessionBody.url) {
      console.error('Session mint failed while enabled=true');
      process.exit(1);
    }
  }

  const chromePath = resolveChrome();
  console.log('Chrome:', chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: isHeadless(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=/tmp/puppeteer-livekit-pilot-${process.pid}`,
    ],
    defaultViewport: { width: 1100, height: 800 },
  });

  try {
    const page = await browser.newPage();
    const pilotUrl = `${baseUrl}/reservation-agent-pilot.html?tenantId=${tenantId}`;
    await page.goto(pilotUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('[data-testid="pilot-status-badge"]', {
      timeout: 15000,
    });
    // Status check runs on load; wait for badge text to settle.
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="pilot-status-badge"]');
        const t = (el && el.textContent) || '';
        return t === 'enabled' || t === 'disabled' || t.startsWith('error');
      },
      { timeout: 15000 },
    );

    const badge = await page.$eval(
      '[data-testid="pilot-status-badge"]',
      (el) => el.textContent.trim(),
    );
    console.log('Pilot page badge:', badge);

    const shotName = status.enabled
      ? 'livekit-reservation-agent-pilot-enabled.png'
      : 'livekit-reservation-agent-pilot-disabled.png';
    const shotPath = join(screenshotDir, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log('Screenshot:', shotPath);

    if (status.enabled && badge !== 'enabled') {
      console.error('API enabled but page badge is', badge);
      process.exit(1);
    }
    if (!status.enabled && badge !== 'disabled') {
      console.error('Expected disabled badge, got', badge);
      process.exit(1);
    }

    if (status.enabled) {
      await page.click('[data-testid="pilot-join"]');
      await page.waitForSelector('[data-testid="pilot-room-name"]', {
        timeout: 20000,
      }).catch(() => null);
      const roomEl = await page.$('[data-testid="pilot-room-name"]');
      if (roomEl) {
        const roomName = await page.$eval(
          '[data-testid="pilot-room-name"]',
          (el) => el.textContent.trim(),
        );
        console.log('Joined session room:', roomName);
        const joinShot = join(
          screenshotDir,
          'livekit-reservation-agent-pilot-joined.png',
        );
        await page.screenshot({ path: joinShot, fullPage: true });
        console.log('Screenshot:', joinShot);
      } else {
        console.log(
          'NOTE: session mint UI did not show room name (LiveKit connect may have failed; check log panel).',
        );
        const failShot = join(
          screenshotDir,
          'livekit-reservation-agent-pilot-join-attempt.png',
        );
        await page.screenshot({ path: failShot, fullPage: true });
        console.log('Screenshot:', failShot);
      }
    }

    console.log('PASS');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
