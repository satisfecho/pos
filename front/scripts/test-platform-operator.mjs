#!/usr/bin/env node
/**
 * Smoke test: platform operator login and dashboard.
 * Usage: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-platform-operator.mjs
 */
import { createRequire } from 'module';
import { isHeadless } from './puppeteer-headless.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4202';
const EMAIL = process.env.PLATFORM_OPERATOR_EMAIL || 'platform-test@amvara.de';
const PASSWORD = process.env.PLATFORM_OPERATOR_PASSWORD || 'test-platform-ops-123';

const CHROME_PATH =
  process.env.CHROME_PATH ||
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : '/usr/bin/google-chrome');

async function main() {
  const browser = await puppeteer.launch({
    headless: isHeadless(),
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE_URL}/platform/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('input#email', { timeout: 10000 });
    await page.type('input#email', EMAIL);
    await page.type('input#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname === '/platform', { timeout: 15000 });
    await page.waitForSelector('.metric-card', { timeout: 15000 });
    const title = await page.$eval('h1', (el) => el.textContent?.trim() || '');
    if (!title) throw new Error('Dashboard title missing');
    const metrics = await page.$$('.metric-card');
    if (metrics.length < 6) throw new Error(`Expected at least 6 metric cards, got ${metrics.length}`);
    for (const key of ['logins_total', 'last_login', 'logins_24h', 'logins_7d']) {
      const el = await page.$(`[data-metric="${key}"]`);
      if (!el) throw new Error(`Missing metric card: ${key}`);
      const label = await el.$eval('h2', (h) => h.textContent?.trim() || '');
      if (!label || label.includes('PLATFORM_DASHBOARD.')) {
        throw new Error(`Metric ${key} label missing or untranslated: ${label}`);
      }
    }
    console.log('OK: platform operator login and dashboard');
    console.log('OK: login metrics visible (total, last, 24h, 7d)');

    await page.waitForSelector('a.tenant-link', { timeout: 10000 });
    const ownerLoginCell = await page.$('[data-testid="owner-login-count"]');
    if (!ownerLoginCell) throw new Error('Missing owner login count column in All tenants table');
    const ownerLoginText = await ownerLoginCell.evaluate((el) => el.textContent?.trim() || '');
    if (!/^\d+$/.test(ownerLoginText)) {
      throw new Error(`Owner login count should be a number, got: ${ownerLoginText}`);
    }
    console.log(`OK: All tenants shows owner login count (${ownerLoginText})`);

    await page.click('a.tenant-link');
    await page.waitForFunction(
      () => /^\/platform\/tenants\/\d+$/.test(window.location.pathname),
      { timeout: 15000 },
    );
    const tenantId = await page.evaluate(() => {
      const m = window.location.pathname.match(/\/platform\/tenants\/(\d+)$/);
      return m ? m[1] : null;
    });
    if (!tenantId) throw new Error('Tenant detail URL missing tenant id');

    await page.waitForSelector('[data-testid="staff-login-count"]', { timeout: 10000 });
    const staffLoginText = await page.$eval(
      '[data-testid="staff-login-count"]',
      (el) => el.textContent?.trim() || '',
    );
    if (!/^\d+$/.test(staffLoginText)) {
      throw new Error(`Staff login count should be a number, got: ${staffLoginText}`);
    }
    console.log(`OK: tenant staff table shows login count (${staffLoginText})`);

    await page.waitForSelector(`a.link-btn[href$="/delivery/${tenantId}"]`, { timeout: 10000 });
    const deliveryHref = await page.$eval(
      `a.link-btn[href$="/delivery/${tenantId}"]`,
      (el) => el.getAttribute('href') || '',
    );
    const expectedSuffix = `/delivery/${tenantId}`;
    if (!deliveryHref.endsWith(expectedSuffix)) {
      throw new Error(`Expected delivery link ending with ${expectedSuffix}, got ${deliveryHref}`);
    }
    const deliveryLabel = await page.$eval(
      `a.link-btn[href$="/delivery/${tenantId}"]`,
      (el) => el.textContent?.trim() || '',
    );
    if (!deliveryLabel || deliveryLabel.includes('LINK_DELIVERY')) {
      throw new Error(`Delivery link label missing or untranslated: ${deliveryLabel}`);
    }
    console.log(`OK: tenant detail delivery link → ${deliveryHref}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message || err);
  process.exit(1);
});
