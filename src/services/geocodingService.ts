// Thin wrapper around OpenStreetMap's Nominatim search API.
//
// Usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// requires a descriptive User-Agent/Referer and caps unattended use at
// 1 request/second. This is only ever called from a manual button press in
// the admin store form, so it naturally stays well under that limit — do not
// wire this up to fire on every keystroke or in a loop.

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (query.length === 0) {
    throw new Error('Enter an address first.');
  }

  const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(
    query
  )}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        // Identifies the app per Nominatim's usage policy. Browsers on the
        // web build will silently drop/override this (they always send
        // their own real User-Agent instead), which is fine — native
        // platforms will send it as-is.
        'User-Agent': 'SalesWheelApp/1.0 (admin store geocoding)',
        Accept: 'application/json',
      },
    });
  } catch {
    throw new Error('Could not reach the geocoding service. Check your connection.');
  }

  if (!response.ok) {
    throw new Error(`Geocoding request failed (${response.status}).`);
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!results || results.length === 0) {
    return null;
  }

  const [first] = results;
  const latitude = Number.parseFloat(first.lat);
  const longitude = Number.parseFloat(first.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    displayName: first.display_name,
  };
}