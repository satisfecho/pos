/**
 * Puppeteer scripts: Chrome runs headless by default.
 * Set HEADLESS=0, false, or no for a visible browser window.
 */
export function isHeadless() {
  const h = (process.env.HEADLESS || '').toLowerCase();
  return h !== '0' && h !== 'false' && h !== 'no';
}
