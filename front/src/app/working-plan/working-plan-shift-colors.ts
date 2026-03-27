/**
 * Stable, distinct hues for working-plan shift rows (calendar chips, week list accent).
 */

export function hueFromUserId(userId: number): number {
  const u = Math.floor(Math.abs(userId)) >>> 0;
  let x = u ^ (u >>> 16);
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x % 360;
}

/** Left border for week-view shift cards. */
export function weekShiftCardBorderLeft(userId: number): string {
  const h = hueFromUserId(userId);
  return `4px solid hsl(${h}, 52%, 38%)`;
}
