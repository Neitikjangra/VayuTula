import { describe, expect, it, vi } from 'vitest';
import airQuality from '../fixtures/openMeteo/airQuality.noida.json';
import geocode from '../fixtures/openMeteo/geocode.noida.json';
import {
  OPEN_METEO_SOURCE,
  airQualityUrl,
  fetchPm25Forecast,
  localToUtcIso,
  searchPlaces,
} from '@/data/openMeteo';
import { MIN_FORECAST_HOURS } from '@/domain/forecast';
import { ProviderError } from '@/lib/errors';
import type { FetchLike } from '@/lib/http';

const NOW = new Date('2026-11-23T19:40:00.000Z');

function jsonFetch(body: unknown, status = 200): FetchLike {
  return vi.fn(async () => Response.json(body, { status }));
}

function withPm25(values: (number | null)[]) {
  return {
    ...airQuality,
    hourly: { time: airQuality.hourly.time.slice(0, values.length), pm2_5: values },
  };
}

describe('fetchPm25Forecast() with the recorded Noida response', () => {
  it('keeps hours from local midnight up to the first missing value', async () => {
    const forecast = await fetchPm25Forecast(28.5449, 77.3921, {
      fetchImpl: jsonFetch(airQuality),
      now: () => NOW,
    });
    const firstNull = airQuality.hourly.pm2_5.indexOf(null);
    expect(forecast.hours).toHaveLength(firstNull);
    expect(forecast.hours.length).toBeGreaterThanOrEqual(MIN_FORECAST_HOURS);
    expect(forecast.hours[0]).toEqual({
      time: '2026-11-23T18:30:00.000Z',
      pm25: airQuality.hourly.pm2_5[0],
    });
  });

  it('records source, fetch time, timezone and rounded location', async () => {
    const forecast = await fetchPm25Forecast(28.5449, 77.3921, {
      fetchImpl: jsonFetch(airQuality),
      now: () => NOW,
    });
    expect(forecast).toMatchObject({
      source: OPEN_METEO_SOURCE,
      fetchedAt: NOW.toISOString(),
      timezone: 'Asia/Kolkata',
      lat: 28.54,
      lon: 77.39,
    });
  });

  it('rejects a forecast shorter than 96 hours as incomplete', async () => {
    const short = withPm25(Array.from({ length: MIN_FORECAST_HOURS - 1 }, () => 50));
    const error = await fetchPm25Forecast(28.54, 77.39, { fetchImpl: jsonFetch(short) }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ kind: 'incomplete' });
  });

  it('rejects a malformed body as a parse error', async () => {
    const error = await fetchPm25Forecast(28.54, 77.39, {
      fetchImpl: jsonFetch({ hourly: 'nope' }),
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ kind: 'parse' });
  });

  it('rejects negative PM2.5 values as a parse error', async () => {
    const bad = withPm25(Array.from({ length: MIN_FORECAST_HOURS }, (_, i) => (i === 3 ? -5 : 40)));
    const error = await fetchPm25Forecast(28.54, 77.39, { fetchImpl: jsonFetch(bad) }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ kind: 'parse' });
  });

  it('passes provider HTTP errors through', async () => {
    const error = await fetchPm25Forecast(28.54, 77.39, {
      fetchImpl: jsonFetch({ error: true }, 400),
    }).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'http', status: 400 });
  });
});

describe('airQualityUrl()', () => {
  it('requests hourly PM2.5 for 6 days in local time at rounded coordinates', () => {
    const url = new URL(airQualityUrl(28.5449, 77.3921));
    expect(url.origin).toBe('https://air-quality-api.open-meteo.com');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '28.54',
      longitude: '77.39',
      hourly: 'pm2_5',
      forecast_days: '6',
      timezone: 'auto',
    });
  });
});

describe('localToUtcIso()', () => {
  it('converts local wall time to UTC using the offset', () => {
    expect(localToUtcIso('2026-11-24T05:30', 19800)).toBe('2026-11-24T00:00:00.000Z');
  });

  it('throws a parse error on a bad timestamp', () => {
    expect(() => localToUtcIso('garbage', 0)).toThrow(ProviderError);
  });
});

describe('searchPlaces()', () => {
  it('maps geocoding results to places', async () => {
    const places = await searchPlaces('Noida', 'en', { fetchImpl: jsonFetch(geocode) });
    expect(places[0]).toEqual({
      id: 7279746,
      name: 'Noida',
      admin1: 'Uttar Pradesh',
      country: 'India',
      lat: 28.58,
      lon: 77.33,
    });
  });

  it('returns an empty list when nothing matches', async () => {
    const places = await searchPlaces('zzzzqqq', 'en', {
      fetchImpl: jsonFetch({ generationtime_ms: 0.1 }),
    });
    expect(places).toEqual([]);
  });

  it('sends the query, language and a small result count', async () => {
    const fetchImpl = jsonFetch(geocode);
    await searchPlaces('नोएडा', 'hi', { fetchImpl });
    const url = new URL(vi.mocked(fetchImpl).mock.calls[0]?.[0] ?? '');
    expect(url.searchParams.get('name')).toBe('नोएडा');
    expect(url.searchParams.get('language')).toBe('hi');
    expect(url.searchParams.get('count')).toBe('5');
  });
});
