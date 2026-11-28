import { Location } from '../context/locationContext.types';

export const LOCATION_STORAGE_KEY = 'userLocation';

/**
 * How long a stored fix is trusted before we quietly look for a newer one.
 * Opening the app inside this window must not touch the GPS at all.
 */
export const LOCATION_TTL_MS = 5 * 60 * 1000;

export interface CachedLocation {
  location: Location;
  cachedAt: number;
}

/**
 * The stored object is kept flat - `cachedAt` rides alongside the location fields
 * because other screens read this key directly and expect latitude/longitude at
 * the top level. Changing to a nested shape would silently break them.
 */
export const readCachedLocation = (): CachedLocation | null => {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const { cachedAt, ...location } = parsed as Record<string, unknown>;
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return null;
    }
    if (Number.isNaN(location.latitude) || Number.isNaN(location.longitude)) {
      return null;
    }

    // Entries written before TTL caching existed carry no timestamp. Treat them as
    // stale so they still show instantly but get refreshed in the background.
    return {
      location: location as unknown as Location,
      cachedAt: typeof cachedAt === 'number' && Number.isFinite(cachedAt) ? cachedAt : 0,
    };
  } catch (e) {
    console.warn('[locationCache] Failed to read cached location', e);
    return null;
  }
};

export const writeCachedLocation = (location: Location): void => {
  try {
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ ...location, cachedAt: Date.now() })
    );
  } catch (e) {
    console.warn('[locationCache] Failed to cache location', e);
  }
};

export const isLocationFresh = (cachedAt: number, now: number = Date.now()): boolean =>
  cachedAt > 0 && now - cachedAt < LOCATION_TTL_MS;
