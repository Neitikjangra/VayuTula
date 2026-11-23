// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import airQuality from '../fixtures/openMeteo/airQuality.noida.json';
import geocode from '../fixtures/openMeteo/geocode.noida.json';
import { fetchPm25Forecast } from '@/data/openMeteo';
import type { Forecast } from '@/domain';
import { ForecastPanel } from '@/ui/ForecastPanel';
import { resetLangForTests } from '@/ui/langStore';

let forecast: Forecast;

beforeAll(async () => {
  const fetchImpl = async () => Response.json(airQuality);
  forecast = await fetchPm25Forecast(28.58, 77.33, {
    fetchImpl,
    now: () => new Date('2026-11-23T19:40:00.000Z'),
  });
});

beforeEach(() => {
  window.localStorage.clear();
  resetLangForTests();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type Route = (url: string) => Response;

function stubApi(routes: { forecast?: Route; geocode?: Route }) {
  const fetchMock = vi.fn(async (input: string) => {
    if (input.startsWith('/api/geocode'))
      return routes.geocode?.(input) ?? new Response(null, { status: 500 });
    return routes.forecast?.(input) ?? new Response(null, { status: 500 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const places = {
  places: geocode.results.map((r) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
  })),
};

async function searchAndPick() {
  fireEvent.change(screen.getByLabelText('City or area'), { target: { value: 'Noida' } });
  await act(async () => {
    fireEvent.submit(screen.getByRole('search'));
  });
  await act(async () => {
    fireEvent.click(await screen.findByRole('button', { name: /^Noida, Uttar Pradesh, India$/ }));
  });
}

describe('ForecastPanel (FR-2)', () => {
  it('searches, picks a place and shows 4 days with source and fetch time', async () => {
    const fetchMock = stubApi({
      geocode: () => Response.json(places),
      forecast: () => Response.json({ forecast, stale: false, ageMinutes: 0 }),
    });
    render(<ForecastPanel />);
    await searchAndPick();
    expect(await screen.findByRole('heading', { name: 'Forecast for Noida' })).toBeTruthy();
    expect(screen.getAllByRole('region', { name: /^Hourly PM2.5 for/ })).toHaveLength(4);
    expect(screen.getByText(/^Source: Open-Meteo Air Quality API/)).toBeTruthy();
    expect(screen.getByText(/^Fetched /)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/forecast?lat=28.58&lon=77.33', expect.anything());
  });

  it('shows every hour as text, not colour alone', async () => {
    stubApi({
      geocode: () => Response.json(places),
      forecast: () => Response.json({ forecast, stale: false, ageMinutes: 0 }),
    });
    render(<ForecastPanel />);
    await searchAndPick();
    const firstDay = (await screen.findAllByRole('region', { name: /^Hourly PM2.5 for/ }))[0];
    const cells = within(firstDay as HTMLElement).getAllByRole('listitem');
    expect(cells).toHaveLength(24);
    expect(cells[0]?.textContent).toBe(`00:00${Math.round(forecast.hours[0]?.pm25 ?? -1)}`);
  });

  it('says when the server served cached data, with its age', async () => {
    stubApi({
      geocode: () => Response.json(places),
      forecast: () => Response.json({ forecast, stale: true, ageMinutes: 95 }),
    });
    render(<ForecastPanel />);
    await searchAndPick();
    expect(await screen.findByText(/Showing data saved 95 minutes ago/)).toBeTruthy();
  });

  it('falls back to the copy saved on this device when the API fails', async () => {
    window.localStorage.setItem('vayutula.lastForecast', JSON.stringify(forecast));
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(forecast.fetchedAt) + 42 * 60_000);
    stubApi({
      geocode: () => Response.json(places),
      forecast: () => new Response(null, { status: 502 }),
    });
    render(<ForecastPanel />);
    await searchAndPick();
    expect(await screen.findByText(/saved on this device 42 minutes ago/)).toBeTruthy();
    expect(screen.getAllByRole('region', { name: /^Hourly PM2.5 for/ })).toHaveLength(4);
  });

  it('shows a friendly error and retries when nothing is saved', async () => {
    const fetchMock = stubApi({
      geocode: () => Response.json(places),
      forecast: () => new Response(null, { status: 502 }),
    });
    render(<ForecastPanel />);
    await searchAndPick();
    expect(await screen.findByText(/couldn't be loaded right now/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/forecast'))).toHaveLength(2);
  });

  it('asks for at least 2 letters without calling the API', async () => {
    const fetchMock = stubApi({});
    render(<ForecastPanel />);
    fireEvent.change(screen.getByLabelText('City or area'), { target: { value: 'N' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('search'));
    });
    expect(screen.getByRole('status').textContent).toBe('Type at least 2 letters.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports when no place matches', async () => {
    stubApi({ geocode: () => Response.json({ places: [] }) });
    render(<ForecastPanel />);
    fireEvent.change(screen.getByLabelText('City or area'), { target: { value: 'Zzzq' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('search'));
    });
    expect(screen.getByRole('status').textContent).toBe(
      'No places found for “Zzzq”. Try another spelling.',
    );
  });

  it('reloads the last chosen place on the next visit', async () => {
    window.localStorage.setItem(
      'vayutula.place',
      JSON.stringify({ kind: 'search', name: 'Noida', lat: 28.58, lon: 77.33 }),
    );
    stubApi({ forecast: () => Response.json({ forecast, stale: false, ageMinutes: 0 }) });
    await act(async () => {
      render(<ForecastPanel />);
    });
    expect(await screen.findByRole('heading', { name: 'Forecast for Noida' })).toBeTruthy();
  });
});

describe('browser location', () => {
  function stubGeolocation(impl: Geolocation['getCurrentPosition']) {
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: impl } });
  }

  it('sends only the location rounded to 2 decimals', async () => {
    const fetchMock = stubApi({
      forecast: () => Response.json({ forecast, stale: false, ageMinutes: 0 }),
    });
    stubGeolocation((ok) =>
      ok({ coords: { latitude: 28.583912, longitude: 77.334567 } } as GeolocationPosition),
    );
    render(<ForecastPanel />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/forecast?lat=28.58&lon=77.33', expect.anything());
    expect(await screen.findByRole('heading', { name: 'Forecast for My location' })).toBeTruthy();
  });

  it('explains when permission is denied', async () => {
    stubApi({});
    stubGeolocation((_ok, fail) =>
      fail?.({
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: '',
      } as GeolocationPositionError),
    );
    render(<ForecastPanel />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    });
    expect(screen.getByRole('status').textContent).toBe(
      "Location access wasn't allowed. Search for your city instead.",
    );
  });
});
