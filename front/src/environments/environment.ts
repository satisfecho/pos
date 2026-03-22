import { commitHash, version } from './commit-hash';

// DEV only: show package version when commit-hash still has placeholder (e.g. ng serve without running get-commit-hash.js)
const DEV_VERSION_FALLBACK = '2.0.19'; // keep in sync with package.json when bumping (used when commit-hash.ts version is 0.0.0)

// Helper to get window config, treating empty string as valid (for relative URLs via HAProxy)
const getWindowConfig = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = (window as any)[key];
  return value !== undefined ? value : fallback;
};

export const environment = {
  production: false,
  staging: false,
  apiUrl: getWindowConfig('__API_URL__', '/api'),
  wsUrl: getWindowConfig('__WS_URL__', '/ws'),
  stripePublishableKey: getWindowConfig('__STRIPE_PUBLISHABLE_KEY__', ''),
  version: (version as string) !== '0.0.0' ? version : DEV_VERSION_FALLBACK,
  commitHash,
};
