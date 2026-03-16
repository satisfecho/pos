#!/usr/bin/env node
/**
 * Rate limiting test: verifies login and register endpoints return 429 after limit.
 * Hits POST /token (login) 6 times with wrong credentials; expects 401 for first 5, 429 on 6th.
 * Optionally hits POST /register 4 times; expects 429 on 4th (limit 3/hour).
 *
 * Note: Running this script will temporarily rate-limit the current IP (login: 15 min, register: 1 hour).
 * Run other Puppeteer tests that need login/register before this one, or use a different IP.
 *
 * Usage (from repo root, app and API running e.g. docker compose up):
 *   node front/scripts/test-rate-limit.mjs
 *   API_URL=http://localhost:8020 node front/scripts/test-rate-limit.mjs
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-rate-limit.mjs
 *
 * Env:
 *   API_URL   API base (e.g. http://localhost:8020 or http://127.0.0.1:4202/api)
 *   BASE_URL  If API_URL not set, BASE_URL + '/api' is used (e.g. HAProxy at 4202)
 *   SKIP_LOGIN_LIMIT   Set to 1 to skip login rate limit test (e.g. if limit is high)
 *   SKIP_REGISTER_LIMIT Set to 1 to skip register rate limit test
 */

const LOGIN_LIMIT = 5;   // 5 attempts per 15 min
const REGISTER_LIMIT = 3; // 3 per hour

function getApiBase() {
  if (process.env.API_URL) return process.env.API_URL.replace(/\/$/, '');
  let base = process.env.BASE_URL;
  if (!base) {
    base = 'http://127.0.0.1:4202';
  }
  base = base.replace(/\/$/, '');
  return base.startsWith('http') && base.includes('/api') ? base : `${base}/api`;
}

async function main() {
  const apiBase = getApiBase();
  console.log('API base:', apiBase);
  console.log('---');

  let failed = false;

  // ---- Login rate limit (5 per 15 min): first 5 get 401, 6th must get 429 ----
  if (!process.env.SKIP_LOGIN_LIMIT) {
    console.log('1. Login rate limit: sending', LOGIN_LIMIT + 1, 'POST /token (wrong password)...');
    const loginUrl = `${apiBase}/token`;
    const loginStatuses = [];
    for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
      const res = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: 'rate-limit-test@example.com', password: 'wrong' }),
      });
      loginStatuses.push(res.status);
      console.log('   Attempt', i + 1, '->', res.status, i < LOGIN_LIMIT ? '' : '(expect 429)');
    }
    const lastLogin = loginStatuses[LOGIN_LIMIT];
    const firstFive = loginStatuses.slice(0, LOGIN_LIMIT);
    if (lastLogin !== 429) {
      console.log('   FAIL: expected 429 on 6th login attempt, got', lastLogin);
      failed = true;
    } else if (firstFive.every((s) => s === 429)) {
      console.log('   WARN: already rate limited (1–5 were 429). Run test in isolation to verify boundary.');
    } else if (!firstFive.every((s) => s === 401)) {
      console.log('   WARN: expected 401 for attempts 1–5, got', firstFive.join(', '));
    }
    console.log('');
  }

  // ---- Register rate limit (3 per hour): 4th attempt must return 429 ----
  if (!process.env.SKIP_REGISTER_LIMIT) {
    console.log('2. Register rate limit: sending', REGISTER_LIMIT + 1, 'POST /register (same IP)...');
    const registerStatuses = [];
    for (let i = 0; i < REGISTER_LIMIT + 1; i++) {
      const params = new URLSearchParams({
        tenant_name: 'Rate Limit Test Tenant',
        email: `rate-limit-reg-${Date.now()}-${i}@example.com`,
        password: 'testpass123',
        full_name: 'Test',
      });
      const registerUrl = `${apiBase}/register?${params.toString()}`;
      const res = await fetch(registerUrl, { method: 'POST' });
      registerStatuses.push(res.status);
      console.log('   Attempt', i + 1, '->', res.status, i < REGISTER_LIMIT ? '' : '(expect 429)');
    }
    const lastReg = registerStatuses[REGISTER_LIMIT];
    const firstThree = registerStatuses.slice(0, REGISTER_LIMIT);
    if (lastReg !== 429) {
      console.log('   FAIL: expected 429 on 4th register attempt, got', lastReg);
      failed = true;
    } else if (firstThree.every((s) => s === 429)) {
      console.log('   WARN: already rate limited (1–3 were 429). Run test in isolation to verify boundary.');
    }
    console.log('');
  }

  console.log('---');
  if (failed) {
    console.log('FAIL: rate limit assertions failed.');
    process.exit(1);
  }
  console.log('PASS: rate limiting behaves as expected.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
