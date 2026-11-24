import { describe, expect, it } from 'vitest';
import { simulateRoom, steadyState, type RoomHourly } from '@/engine/indoor';

const H = 48;
const fill = (v: number) => Array.from({ length: H }, () => v);

function room(overrides: Partial<RoomHourly> = {}): RoomHourly {
  return {
    volumeM3: 25,
    deposition: 0.2,
    airExchange: fill(0.3),
    penetration: fill(0.6),
    purifierCadr: 0,
    purifierFraction: fill(0),
    sourceUgPerHour: fill(0),
    ...overrides,
  };
}

describe('steadyState() (PRD 4.2)', () => {
  it('matches C_ss = (P·a·C_out + S/V) / λ by hand', () => {
    // λ = 0.3 + 0.2 = 0.5; C_ss = 0.6 · 0.3 · 100 / 0.5 = 36
    expect(steadyState({ cOut: 100, a: 0.3, p: 0.6, k: 0.2, q: 0, f: 0, v: 25, s: 0 })).toBeCloseTo(
      36,
      10,
    );
    // add a source: S/V = 2500/25 = 100 → (18 + 100) / 0.5 = 236
    expect(
      steadyState({ cOut: 100, a: 0.3, p: 0.6, k: 0.2, q: 0, f: 0, v: 25, s: 2500 }),
    ).toBeCloseTo(236, 10);
  });
});

describe('simulateRoom()', () => {
  it('a sealed room with no purifier converges to the expected steady state', () => {
    const series = simulateRoom(fill(100), room(), 0);
    expect(series).toHaveLength(H);
    expect(series[0]).toBeCloseTo(36 * (1 - Math.exp(-0.5)), 10);
    expect(series[H - 1]).toBeCloseTo(36, 6);
  });

  it('starts at the first hour’s steady state when no initial level is given', () => {
    const series = simulateRoom(fill(100), room());
    expect(series.every((c) => Math.abs(c - 36) < 1e-9)).toBe(true);
  });

  it('a running purifier lowers the indoor level every hour', () => {
    const off = simulateRoom(fill(100), room());
    const on = simulateRoom(fill(100), room({ purifierCadr: 200, purifierFraction: fill(1) }));
    on.forEach((c, i) => expect(c).toBeLessThan(off[i] ?? 0));
    // λ = 0.5 + 200/25 = 8.5 → C_ss = 18 / 8.5
    expect(on[H - 1]).toBeCloseTo(18 / 8.5, 6);
  });

  it('airing during a clean outdoor hour lowers the indoor level', () => {
    const cOut = fill(200).map((v, i) => (i === 10 ? 20 : v));
    const closed = simulateRoom(cOut, room());
    const airing = room({
      airExchange: fill(0.3).map((v, i) => (i === 10 ? 6 : v)),
      penetration: fill(0.6).map((v, i) => (i === 10 ? 1 : v)),
    });
    expect(simulateRoom(cOut, airing)[10]).toBeLessThan(closed[10] ?? 0);
  });

  it('an indoor source raises the level only from its hour', () => {
    const base = simulateRoom(fill(100), room());
    const withSource = simulateRoom(
      fill(100),
      room({ sourceUgPerHour: fill(0).map((_, i) => (i === 5 ? 20000 : 0)) }),
    );
    expect(withSource[4]).toBeCloseTo(base[4] ?? 0, 10);
    expect(withSource[5]).toBeGreaterThan((base[5] ?? 0) + 100);
  });

  it.each([
    ['zero volume', room({ volumeM3: 0 })],
    ['negative deposition', room({ deposition: -0.1 })],
    ['negative CADR', room({ purifierCadr: -5 })],
    ['fraction above 1', room({ purifierFraction: fill(1.5) })],
    ['penetration above 1', room({ penetration: fill(1.2) })],
    ['negative source', room({ sourceUgPerHour: fill(-1) })],
    ['mismatched lengths', room({ airExchange: [0.3] })],
  ])('rejects out-of-range input: %s', (_label, bad) => {
    expect(() => simulateRoom(fill(100), bad)).toThrow(RangeError);
  });

  it('rejects negative or non-finite outdoor values', () => {
    expect(() => simulateRoom(fill(-1), room())).toThrow(RangeError);
    expect(() => simulateRoom(fill(Number.NaN), room())).toThrow(RangeError);
  });
});
