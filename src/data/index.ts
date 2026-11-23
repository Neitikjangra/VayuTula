/** data/: adapters for external air-quality providers, with caching. */
import { createForecastService } from './forecastService';

export { TtlCache, locationKey, type CacheEntry } from './cache';
export { OPEN_METEO_SOURCE, airQualityUrl, fetchPm25Forecast, searchPlaces } from './openMeteo';
export { FORECAST_TTL_MS, createForecastService, type ForecastService } from './forecastService';

/** Process-wide service used by the API routes (cache lives per server instance). */
export const forecastService = createForecastService();
