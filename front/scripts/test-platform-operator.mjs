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

    await page.waitForSelector('[data-testid="usage-chart"]', { timeout: 10000 });
    const usageTitle = await page.$eval('[data-testid="usage-chart"] h2', (el) => el.textContent?.trim() || '');
    if (!usageTitle || usageTitle.includes('PLATFORM_DASHBOARD.')) {
      throw new Error(`Usage chart title missing or untranslated: ${usageTitle}`);
    }
    for (const days of [7, 30, 90, 365, 1095]) {
      const btn = await page.$(`[data-testid="usage-days-${days}"]`);
      if (!btn) throw new Error(`Missing usage period button: ${days}`);
    }
    await page.waitForSelector('[data-testid="usage-days-365"]', { timeout: 10000 });
    await page.click('[data-testid="usage-days-365"]');
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="usage-days-365"]');
        const pressed = el?.getAttribute('aria-pressed');
        return pressed === 'true' || el?.classList.contains('active');
      },
      { timeout: 15000 },
    );
    console.log(`OK: usage chart visible (${usageTitle}) with 7/30/90/1y/3y periods`);

    await page.waitForSelector('[data-testid="top-active-tenants"]', { timeout: 10000 });
    const topTitle = await page.$eval('[data-testid="top-active-tenants"] h2', (el) => el.textContent?.trim() || '');
    if (!topTitle || topTitle.includes('PLATFORM_DASHBOARD.')) {
      throw new Error(`Top active title missing or untranslated: ${topTitle}`);
    }
    console.log(`OK: top active clients section visible (${topTitle})`);

    await page.waitForSelector('[data-testid="tenants-grid"] .ag-root', { timeout: 15000 });
    await page.waitForSelector('[data-testid="tenant-filter"]', { timeout: 5000 });
    const pager = await page.$('.ag-paging-panel');
    if (!pager) throw new Error('Expected AG Grid pagination panel');
    const pageSizeText = await page.$eval('.ag-paging-panel', (el) => el.textContent || '');
    if (!/500/.test(pageSizeText) && !/Page/.test(pageSizeText)) {
      // Page size selector may show 500 in a select; accept any pagination chrome.
      console.log(`WARN: pagination text did not clearly show 500: ${pageSizeText.slice(0, 80)}`);
    }
    console.log('OK: tenants AG Grid with pagination');

    const tenantLoginCell = await page.$('[data-testid="tenant-login-count"]');
    if (!tenantLoginCell) throw new Error('Missing tenant login count in AG Grid');
    const tenantLoginText = await tenantLoginCell.evaluate((el) => {
      const count = el.querySelector('.activity-count');
      return (count?.textContent || el.textContent || '').trim();
    });
    if (!/^\d+$/.test(tenantLoginText)) {
      throw new Error(`Tenant login count should be a number, got: ${tenantLoginText}`);
    }
    console.log(`OK: All tenants shows tenant login count (${tenantLoginText})`);

    const firstName = await page.$eval('[data-testid="tenants-grid"] a.tenant-link', (el) => el.textContent?.trim() || '');
    if (firstName) {
      const needle = firstName.slice(0, Math.min(8, firstName.length));
      await page.focus('[data-testid="tenant-filter"]');
      await page.$eval('[data-testid="tenant-filter"]', (el) => {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.type('[data-testid="tenant-filter"]', needle);
      await page.waitForFunction(
        (name) => {
          const links = [...document.querySelectorAll('[data-testid="tenants-grid"] a.tenant-link')];
          return links.length >= 1 && links.every((a) => (a.textContent || '').toLowerCase().includes(name.slice(0, 3).toLowerCase()));
        },
        { timeout: 10000 },
        firstName,
      );
      console.log(`OK: tenant quick-filter narrows grid for "${firstName}"`);
      await page.$eval('[data-testid="tenant-filter"]', (el) => {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForSelector('[data-testid="tenants-grid"] a.tenant-link', { timeout: 10000 });
    }

    await page.click('[data-testid="tenants-grid"] a.tenant-link');
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

    await page.waitForSelector(`a.link-btn[href$="/public-menu/${tenantId}"]`, { timeout: 10000 });
    const menuHref = await page.$eval(
      `a.link-btn[href$="/public-menu/${tenantId}"]`,
      (el) => el.getAttribute('href') || '',
    );
    if (!menuHref.endsWith(`/public-menu/${tenantId}`)) {
      throw new Error(`Expected public-menu link ending with /public-menu/${tenantId}, got ${menuHref}`);
    }
    console.log(`OK: tenant detail public-menu link → ${menuHref}`);

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
