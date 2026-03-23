#!/usr/bin/env node
/**
 * Puppeteer test: API docs at /api/docs load (Swagger UI and OpenAPI spec).
 *
 * Usage (from repo root):
 *   node front/scripts/test-api-docs.mjs
 *   BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-api-docs.mjs
 *
 * Env:
 *   BASE_URL   App URL (default: auto-detect port 4203, 4202, 4200)
 *   HEADLESS       Default headless; set 0, false, or no for a visible browser.
 */

import { isHeadless } from './puppeteer-headless.mjs';
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
        const res = await fetch(`http://127.0.0.1:${port}/api/docs`, {
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

  const headless = isHeadless();
  const docsUrl = new URL('/api/docs', baseUrl).href;
  console.log('BASE_URL:', baseUrl);
  console.log('API docs URL:', docsUrl);
  console.log('Headless:', headless);
  console.log('---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless,
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const failedRequests = [];
  page.on('requestfailed', (req) => failedRequests.push({ url: req.url(), failure: req.failure()?.errorText }));

  try {
    console.log('1. Loading /api/docs...');
    await page.goto(docsUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    const status = page.url() === docsUrl ? 'ok' : 'redirected';
    console.log('   Final URL:', page.url());

    // Swagger UI renders .swagger-ui or #swagger-ui; wait for it and for spec to load (or error to appear)
    await page.waitForSelector('.swagger-ui, #swagger-ui, .info .title', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 2000));

    const hasSwagger = await page.evaluate(() => {
      return !!(
        document.querySelector('.swagger-ui') ||
        document.querySelector('#swagger-ui') ||
        document.querySelector('.info .title')
      );
    });

    const hasLoadError = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      return body.includes('Failed to load API definition') || body.includes('fetch error');
    });

    await browser.close();

    if (!hasSwagger) {
      console.log('   FAIL: Swagger UI container or .info .title not found.');
      process.exit(1);
    }

    if (hasLoadError) {
      console.log('   FAIL: Page shows "Failed to load API definition" or fetch error.');
      process.exit(1);
    }

    const openApiFailed = failedRequests.some((r) => r.url.includes('openapi.json'));
    if (openApiFailed) {
      console.log('   FAIL: OpenAPI spec request failed:', failedRequests.filter((r) => r.url.includes('openapi')));
      process.exit(1);
    }

    console.log('   Swagger UI loaded; API definition loaded.');
    console.log('\n>>> RESULT: API docs at /api/docs load successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (failedRequests.length) {
      console.error('Failed requests:', failedRequests.slice(0, 5));
    }
    await browser.close();
    process.exit(1);
  }
}

main();
