import { commitHash, version } from './commit-hash';
import packageJson from '../../package.json';

// DEV only: when commit-hash.ts still has placeholder 0.0.0 (e.g. ng serve without get-commit-hash.js)
const packageVersion: string = packageJson.version;

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
  version: (version as string) !== '0.0.0' ? version : packageVersion,
  commitHash,
};
