#!/usr/bin/env node
/**
 * Puppeteer test: book page shows WhatsApp link when tenant has a WhatsApp number.
 * Opens /book/1, waits for load, checks for WhatsApp link and optionally fetches
 * public tenant API to debug why it might be missing.
 *
 * Usage (from repo root, app running on 4202):
 *   node front/scripts/test-book-whatsapp-puppeteer.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-book-whatsapp-puppeteer.mjs
 *
 * Env: BASE_URL, HEADLESS (default headless; 0/false/no = visible), API_BASE (defaults to BASE_URL; use if API is on another origin)
 */

import { isHeadless } from './puppeteer-headless.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TENANT_ID = 1;

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
    baseUrl = baseUrl || 'http://127.0.0.1:4202';
  }

  const apiBase = process.env.API_BASE || baseUrl;
  const headless = isHeadless();

  console.log('BASE_URL:', baseUrl);
  console.log('API_BASE:', apiBase);
  console.log('Headless:', headless);
  console.log('Testing /book/' + TENANT_ID + ' for WhatsApp link...');
  console.log('---');

  // Optional: fetch public tenant to see what the API returns (helps debug)
  let tenantFromApi = null;
  try {
    const apiUrl = `${apiBase.replace(/\/$/, '')}/api/public/tenants/${TENANT_ID}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      tenantFromApi = await res.json();
      console.log('Tenant from API:', {
        id: tenantFromApi.id,
        name: tenantFromApi.name,
        phone: tenantFromApi.phone ?? '(null)',
        email: tenantFromApi.email ?? '(null)',
        whatsapp: tenantFromApi.whatsapp ?? '(null)',
      });
      if (tenantFromApi.whatsapp == null || tenantFromApi.whatsapp === '') {
        console.log('  -> Tenant has no whatsapp set; WhatsApp link will not appear. Set it in Settings → Contact.');
      }
    } else {
      console.log('API returned', res.status, '- skipping API debug (proxy/backend may differ).');
    }
  } catch (e) {
    console.log('Could not fetch tenant API:', e.message);
  }
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[browser]', msg.text()));

  try {
    const bookUrl = new URL(`/book/${TENANT_ID}`, baseUrl).href;
    console.log('Loading', bookUrl, '...');
    await page.goto(bookUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    // Wait for book page to be present and loading to finish
    await page.waitForSelector('.book-page', { timeout: 10000 });
    await page.waitForFunction(
      () => !document.querySelector('.book-page .loading-screen'),
      { timeout: 10000 }
    );

    // What contact block shows
    const contactInfo = await page.evaluate(() => {
      const contact = document.querySelector('.restaurant-contact');
      if (!contact) return { hasBlock: false, links: [], text: '' };
      const links = Array.from(contact.querySelectorAll('a')).map((a) => ({
        href: a.getAttribute('href') || '',
        text: (a.textContent || '').trim(),
        isWhatsApp: a.classList.contains('contact-link-whatsapp') || (a.getAttribute('href') || '').includes('wa.me'),
      }));
      return {
        hasBlock: true,
        links,
        text: (contact.textContent || '').trim(),
      };
    });

    const whatsappLink = contactInfo.links?.find((l) => l.isWhatsApp);
    const hasWhatsAppLink = !!whatsappLink;

    console.log('Contact block present:', contactInfo.hasBlock);
    console.log('Contact links:', contactInfo.links?.length ?? 0);
    if (contactInfo.links?.length) {
      contactInfo.links.forEach((l, i) => {
        console.log('  ', i + 1, l.text, '->', l.href?.slice(0, 50) + (l.href?.length > 50 ? '...' : ''));
      });
    }
    console.log('WhatsApp link found:', hasWhatsAppLink, hasWhatsAppLink ? whatsappLink?.href : '');

    await browser.close();

    if (tenantFromApi?.whatsapp) {
      if (!hasWhatsAppLink) {
        console.log('\nFAIL: Tenant has whatsapp in API but no WhatsApp link on book page.');
        process.exit(1);
      }
      console.log('\nPASS: WhatsApp link visible on book page.');
      process.exit(0);
    }

    if (hasWhatsAppLink) {
      console.log('\nPASS: WhatsApp link visible on book page.');
      process.exit(0);
    }

    console.log('\nSKIP/INFO: No WhatsApp link on page.');
    if (tenantFromApi && !tenantFromApi.whatsapp) {
      console.log('Tenant has no whatsapp in API – set WhatsApp number in Settings → Contact for tenant', TENANT_ID);
    } else if (tenantFromApi && tenantFromApi.whatsapp) {
      console.log('API returns whatsapp but the book page did not show the link – restart the backend (e.g. docker compose restart pos-back) and hard-refresh the browser.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
