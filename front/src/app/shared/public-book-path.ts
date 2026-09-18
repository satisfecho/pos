/** Prefer /{public_slug}/book; fall back to /book/{id} (#415). */

export function publicBookTenantRef(tenant: {
  id: number;
  public_slug?: string | null;
}): string | number {
  const slug = tenant.public_slug?.trim();
  return slug || tenant.id;
}

/** Absolute path string for share links and smoke tests. */
export function publicBookPath(tenant: {
  id: number;
  public_slug?: string | null;
}): string {
  const slug = tenant.public_slug?.trim();
  if (slug) return `/${slug}/book`;
  return `/book/${tenant.id}`;
}

/** routerLink commands for the canonical book URL. */
export function publicBookRouterLink(tenant: {
  id: number;
  public_slug?: string | null;
}): (string | number)[] {
  const slug = tenant.public_slug?.trim();
  if (slug) return ['/', slug, 'book'];
  return ['/book', tenant.id];
}

/** True for /book/... or /{slug}/book (optional trailing slash already stripped). */
export function isPublicBookPath(path: string): boolean {
  const p = (path || '').split('?')[0].replace(/\/$/, '') || '/';
  if (p === '/book' || p.startsWith('/book/')) return true;
  return /^\/[^/]+\/book$/.test(p);
}
