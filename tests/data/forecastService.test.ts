import { describe, expect, it, vi } from 'vitest';
import airQuality from '../fixtures/openMeteo/airQuality.noida.json';
import geocode from '../fixtures/openMeteo/geocode.noida.json';
import { createForecastService } from '@/data/forecastService';
import type { FetchLike } from '@/lib/http';

const HOUR = 60 * 60 * 1000;
const START = Date.parse('2026-11-23T19:40:00.000Z');

function setup(body: unknown = airQuality) {
  let now = START;
  const fetchImpl = vi.fn<FetchLike>(async () => Response.json(body));
  const service = createForecastService({ fetchImpl, now: () => now });
  return { service, fetchImpl, advance: (ms: number) => (now += ms) };
}

describe('forecast service cache (FR-2)', () => {
  it('serves a cache hit without a network call', async () => {
    const { service, fetchImpl } = setup();
    const first = await service.getForecast(28.5449, 77.3921);
    const second = await service.getForecast(28.5401, 77.3949);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second.forecast).toBe(first.forecast);
    expect(second).toMatchObject({ stale: false });
  });

  it('reports the age of a cached forecast in minutes', async () => {
    const { service, advance } = setup();
    await service.getForecast(28.54, 77.39);
    advance(25 * 60 * 1000);
    expect((await service.getForecast(28.54, 77.39)).ageMinutes).toBe(25);
  });

  it('refetches a different rounded location', async () => {
    const { service, fetchImpl } = setup();
    await service.getForecast(28.54, 77.39);
    await service.getForecast(28.55, 77.39);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('refetches after one hour', async () => {
    const { service, fetchImpl, advance } = setup();
    await service.getForecast(28.54, 77.39);
    advance(HOUR);
    await service.getForecast(28.54, 77.39);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('serves the last cached forecast, marked stale with its age, when the provider fails', async () => {
    const { service, fetchImpl, advance } = setup();
    await service.getForecast(28.54, 77.39);
    advance(2 * HOUR);
    fetchImpl.mockResolvedValueOnce(new Response('down', { status: 503 }));
    const result = await service.getForecast(28.54, 77.39);
    expect(result).toMatchObject({ stale: true, ageMinutes: 120 });
  });

  it('throws a provider error when nothing is cached', async () => {
    const { service, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(new Response('down', { status: 503 }));
    await expect(service.getForecast(28.54, 77.39)).rejects.toMatchObject({ kind: 'http' });
  });
});

describe('place search cache', () => {
  it('caches by language and case-insensitive query', async () => {
    const { service, fetchImpl } = setup(geocode);
    await service.searchPlaces('Noida', 'en');
    await service.searchPlaces('noida', 'en');
    await service.searchPlaces('Noida', 'hi');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
