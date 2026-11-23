import { afterEach, describe, expect, it, vi } from 'vitest';
import airQuality from '../fixtures/openMeteo/airQuality.noida.json';
import geocode from '../fixtures/openMeteo/geocode.noida.json';
import { GET as getForecast } from '@/app/api/forecast/route';
import { GET as getGeocode } from '@/app/api/geocode/route';
import { ForecastResponseSchema, GeocodeResponseSchema } from '@/domain/forecast';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const forecastReq = (query: string) => new Request(`http://localhost/api/forecast?${query}`);
const geocodeReq = (query: string) => new Request(`http://localhost/api/geocode?${query}`);

describe('GET /api/forecast', () => {
  it.each([
    ['missing params', ''],
    ['empty values', 'lat=&lon='],
    ['non-numeric', 'lat=abc&lon=77'],
    ['latitude out of range', 'lat=91&lon=77'],
    ['longitude out of range', 'lat=28&lon=-181'],
    ['exponent notation', 'lat=1e1&lon=77'],
  ])('rejects %s with 400 and makes no provider call', async (_label, query) => {
    const fetchMock = stubFetch(airQuality);
    const response = await getForecast(forecastReq(query));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_query' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a valid forecast with source and fetch time', async () => {
    stubFetch(airQuality);
    const response = await getForecast(forecastReq('lat=10.11&lon=20.22'));
    expect(response.status).toBe(200);
    const body = ForecastResponseSchema.parse(await response.json());
    expect(body.forecast.source).toContain('Open-Meteo');
    expect(body.stale).toBe(false);
    expect(response.headers.get('cache-control')).toContain('s-maxage');
  });

  it('returns a generic 502 without internal details when the provider fails', async () => {
    stubFetch({ reason: 'internal detail' }, 500);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await getForecast(forecastReq('lat=-33.33&lon=44.44'));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'provider_unavailable' });
  });

  it('logs the failure category only, never the location', async () => {
    stubFetch({}, 503);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await getForecast(forecastReq('lat=-12.34&lon=56.78'));
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).toContain('http 503');
    expect(logged).not.toMatch(/12\.34|56\.78/);
  });
});

describe('GET /api/geocode', () => {
  it.each([
    ['missing q', ''],
    ['one character', 'q=a'],
    ['only spaces', 'q=%20%20%20'],
    ['over 80 characters', `q=${'x'.repeat(81)}`],
    ['unknown language', 'q=Noida&lang=fr'],
  ])('rejects %s with 400', async (_label, query) => {
    const fetchMock = stubFetch(geocode);
    const response = await getGeocode(geocodeReq(query));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns matching places', async () => {
    stubFetch(geocode);
    const response = await getGeocode(geocodeReq('q=Noida%20test&lang=en'));
    expect(response.status).toBe(200);
    const body = GeocodeResponseSchema.parse(await response.json());
    expect(body.places[0]?.name).toBe('Noida');
  });

  it('returns a generic 502 when geocoding fails', async () => {
    stubFetch({}, 500);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await getGeocode(geocodeReq('q=Faridabad'));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'provider_unavailable' });
  });
});
