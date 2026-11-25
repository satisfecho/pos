#!/usr/bin/env node
/**
 * Smoke: self-hosted login CAPTCHA (#452).
 * - GET /captcha/challenge returns id + svg
 * - After LOGIN_CAPTCHA_AFTER_FAILURES wrong logins (default 3), next POST /token
 *   without captcha returns 400 with require_captcha + captcha challenge
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-login-captcha.mjs
 * Optional: LOGIN_CAPTCHA_FIXED_CODE (must match server non-prod setting) to also
 *   assert wrong-answer → 400 captcha_invalid and that a correct answer is accepted
 *   at the captcha gate (still 401 if password is wrong).
 */

function getApiBase() {
  if (process.env.API_URL) return process.env.API_URL.replace(/\/$/, '');
  let base = process.env.BASE_URL || 'http://127.0.0.1:4202';
  base = base.replace(/\/$/, '');
  return base.startsWith('http') && base.includes('/api') ? base : `${base}/api`;
}

async function postToken(apiBase, extra = {}) {
  const body = new URLSearchParams({
    username: `captcha-smoke-${Date.now()}@amvara.de`,
    password: 'wrong-password',
    ...extra,
  });
  return fetch(`${apiBase}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function main() {
  const apiBase = getApiBase();
  const after = Number.parseInt(process.env.LOGIN_CAPTCHA_AFTER_FAILURES || '3', 10) || 3;
  console.log('API base:', apiBase);
  console.log('Threshold:', after);

  const chRes = await fetch(`${apiBase}/captcha/challenge`);
  if (!chRes.ok) {
    console.error('FAIL: GET /captcha/challenge ->', chRes.status);
    process.exit(1);
  }
  const ch = await chRes.json();
  if (!ch.id || !ch.svg || !String(ch.svg).includes('<svg')) {
    console.error('FAIL: challenge missing id/svg', ch);
    process.exit(1);
  }
  console.log('OK: challenge', ch.id.slice(0, 8) + '…');

  let last;
  for (let i = 0; i < after; i++) {
    last = await postToken(apiBase);
    console.log(`  fail ${i + 1} ->`, last.status);
    if (last.status !== 401 && last.status !== 400) {
      console.error('FAIL: expected 401/400 on failed login, got', last.status);
      process.exit(1);
    }
  }

  const gated = await postToken(apiBase);
  const gatedBody = await gated.json().catch(() => ({}));
  console.log('  gated without captcha ->', gated.status, gatedBody.require_captcha ? 'require_captcha' : '');
  if (gated.status !== 400 || !gatedBody.require_captcha || !gatedBody.captcha?.id) {
    console.error('FAIL: expected 400 require_captcha with challenge, got', gated.status, gatedBody);
    process.exit(1);
  }
  console.log('OK: captcha required after', after, 'failures');

  const fixed = (process.env.LOGIN_CAPTCHA_FIXED_CODE || '').trim();
  if (fixed) {
    const bad = await postToken(apiBase, {
      captcha_id: gatedBody.captcha.id,
      captcha_answer: 'WRONGX',
    });
    const badBody = await bad.json().catch(() => ({}));
    console.log('  wrong captcha ->', bad.status);
    if (bad.status !== 400 || !badBody.require_captcha) {
      console.error('FAIL: wrong captcha should be 400 require_captcha', bad.status, badBody);
      process.exit(1);
    }
    const nextCh = badBody.captcha;
    const okGate = await postToken(apiBase, {
      captcha_id: nextCh.id,
      captcha_answer: fixed,
    });
    console.log('  correct captcha + wrong password ->', okGate.status);
    if (okGate.status !== 401) {
      console.error('FAIL: expected 401 after valid captcha + wrong password, got', okGate.status);
      process.exit(1);
    }
    console.log('OK: fixed-code captcha path');
  } else {
    console.log('SKIP: fixed-code path (set LOGIN_CAPTCHA_FIXED_CODE to exercise)');
  }

  console.log('PASS: login captcha smoke');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
