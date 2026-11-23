import { forecastService } from '@/data';
import { ForecastQuerySchema } from '@/domain';
import { jsonError, logFailure } from '@/lib';

/** GET /api/forecast?lat&lon — hourly PM2.5 (FR-2), cached 1 h per rounded location. */
export async function GET(request: Request): Promise<Response> {
  const query = ForecastQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return jsonError(400, 'invalid_query');
  try {
    const result = await forecastService.getForecast(query.data.lat, query.data.lon);
    const cacheControl = result.stale ? 'no-store' : 'public, max-age=0, s-maxage=600';
    return Response.json(result, { headers: { 'Cache-Control': cacheControl } });
  } catch (error) {
    logFailure('forecast', error);
    return jsonError(502, 'provider_unavailable');
  }
}
