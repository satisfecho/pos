import { hueFromUserId, weekShiftCardBorderLeft } from './working-plan-shift-colors';

describe('working-plan-shift-colors', () => {
  it('hueFromUserId is stable for the same id', () => {
    expect(hueFromUserId(7)).toBe(hueFromUserId(7));
  });

  it('spreads hues across typical user ids', () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const hues = new Set(ids.map((id) => hueFromUserId(id)));
    expect(hues.size).toBeGreaterThanOrEqual(8);
  });

  it('weekShiftCardBorderLeft includes hsl', () => {
    const b = weekShiftCardBorderLeft(99);
    expect(b).toMatch(/^4px solid hsl\(/);
  });
});
