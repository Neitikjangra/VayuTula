/** One room's hourly inputs to the single-zone model (PRD 4.2). Arrays have one entry per hour. */
export interface RoomHourly {
  /** V, m³. */
  volumeM3: number;
  /** k, 1/h. */
  deposition: number;
  /** a, 1/h. */
  airExchange: number[];
  /** P, 0–1. */
  penetration: number[];
  /** q, m³/h (0 when the room has no purifier). */
  purifierCadr: number;
  /** f, share of each hour the purifier runs, 0–1. */
  purifierFraction: number[];
  /** S, µg/h emitted indoors. */
  sourceUgPerHour: number[];
}

/** The model terms for one hour. */
export interface HourParams {
  cOut: number;
  a: number;
  p: number;
  k: number;
  q: number;
  f: number;
  v: number;
  s: number;
}

/** λ = a + k + f·q / V, in 1/h. */
export function decayRate({ a, k, q, f, v }: HourParams): number {
  return a + k + (f * q) / v;
}

/** C_ss = (P·a·C_out + S/V) / λ, in µg/m³. */
export function steadyState(h: HourParams): number {
  return (h.p * h.a * h.cOut + h.s / h.v) / decayRate(h);
}

function assertRange(ok: boolean, what: string): void {
  if (!ok) throw new RangeError(`indoor model input out of range: ${what}`);
}

function validate(cOut: number[], room: RoomHourly): void {
  const n = cOut.length;
  const series = [room.airExchange, room.penetration, room.purifierFraction, room.sourceUgPerHour];
  assertRange(
    series.every((s) => s.length === n),
    'hourly arrays must match the forecast length',
  );
  assertRange(Number.isFinite(room.volumeM3) && room.volumeM3 > 0, 'volume');
  assertRange(room.deposition >= 0 && room.purifierCadr >= 0, 'deposition or CADR');
  assertRange(
    cOut.every((c) => Number.isFinite(c) && c >= 0),
    'outdoor PM2.5',
  );
  assertRange(
    room.airExchange.every((a) => a >= 0),
    'air exchange',
  );
  assertRange(
    room.penetration.every((p) => p >= 0 && p <= 1),
    'penetration',
  );
  assertRange(
    room.purifierFraction.every((f) => f >= 0 && f <= 1),
    'purifier fraction',
  );
  assertRange(
    room.sourceUgPerHour.every((s) => Number.isFinite(s) && s >= 0),
    'indoor source',
  );
}

function hourParams(cOut: number[], room: RoomHourly, t: number): HourParams {
  const params: HourParams = {
    cOut: cOut[t] ?? 0,
    a: room.airExchange[t] ?? 0,
    p: room.penetration[t] ?? 0,
    k: room.deposition,
    q: room.purifierCadr,
    f: room.purifierFraction[t] ?? 0,
    v: room.volumeM3,
    s: room.sourceUgPerHour[t] ?? 0,
  };
  assertRange(decayRate(params) > 0, 'λ must be positive');
  return params;
}

/**
 * Hourly indoor PM2.5 (µg/m³) at the end of each hour:
 * C(t+1) = C_ss + (C(t) − C_ss)·e^(−λ·1 h). Starts from `initial`, or from the first
 * hour's steady state when not given. Throws RangeError on out-of-range input.
 */
export function simulateRoom(cOut: number[], room: RoomHourly, initial?: number): number[] {
  validate(cOut, room);
  let c = initial ?? steadyState(hourParams(cOut, room, 0));
  return cOut.map((_, t) => {
    const h = hourParams(cOut, room, t);
    const css = steadyState(h);
    c = css + (c - css) * Math.exp(-decayRate(h));
    return c;
  });
}
