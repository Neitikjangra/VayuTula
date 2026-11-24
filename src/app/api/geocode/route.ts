import { forecastService } from '@/data';
import { GeocodeQuerySchema } from '@/domain';
import { dataRateLimiter, jsonError, logFailure, rateLimited } from '@/lib';

/** GET /api/geocode?q&lang — city search (FR-2). q is 2–80 characters. */
export async function GET(request: Request): Promise<Response> {
  const limited = rateLimited(dataRateLimiter, request);
  if (limited) return limited;
  const query = GeocodeQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return jsonError(400, 'invalid_query');
  try {
    const places = await forecastService.searchPlaces(query.data.q, query.data.lang);
    return Response.json(
      { places },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
    );
  } catch (error) {
    logFailure('geocode', error);
    return jsonError(502, 'provider_unavailable');
  }
}
