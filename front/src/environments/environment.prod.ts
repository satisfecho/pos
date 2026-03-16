import { commitHash } from './commit-hash';

/** Use same-origin /api when configured URL points to another host (e.g. server has API_URL=http://localhost:4202/api). */
function getApiUrl(): string {
  if (typeof window === 'undefined') return '/api';
  const raw = (window as any).__API_URL__;
  if (!raw) return '/api';
  if (raw.startsWith('/')) return raw;
  try {
    const u = new URL(raw);
    if (u.host !== window.location.host) return '/api';
  } catch (_) {}
  return raw;
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const raw = (window as any).__WS_URL__;
  if (!raw) return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  if (raw.startsWith('ws')) {
    try {
      const u = new URL(raw);
      if (u.host !== window.location.host) return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    } catch (_) {}
  }
  return raw;
}

export const environment = {
  production: true,
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
  stripePublishableKey: (typeof window !== 'undefined' && (window as any).__STRIPE_PUBLISHABLE_KEY__) || '',
  version: '1.0.13',
  commitHash: commitHash,
};
