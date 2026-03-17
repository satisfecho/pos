#!/usr/bin/env node
/**
 * Injects <meta name="app-version" content="X.Y.Z"> into the built index.html
 * so the landing page can be smoke-tested for version without login.
 * Run after production-static build (output in dist/front/browser/index.html).
 */
const fs = require('fs');
const path = require('path');

// When run from repo root (e.g. Docker /app): scripts/ is under /app, dist is /app/dist
const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const indexPath = path.join(root, 'dist', 'front', 'browser', 'index.html');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '0.0.0';

if (!fs.existsSync(indexPath)) {
  console.error('inject-version: index.html not found at', indexPath);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');
if (html.indexOf('name="app-version"') !== -1) {
  process.exit(0);
}

// Insert before </head> (case-insensitive for robustness)
const meta = `<meta name="app-version" content="${version}">`;
html = html.replace(/<\/head>/i, meta + '</head>');
fs.writeFileSync(indexPath, html);
console.log('inject-version: injected app-version', version);
