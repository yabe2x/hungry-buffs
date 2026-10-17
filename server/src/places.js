// Google Places API (New)
// Docs: https://developers.google.com/maps/documentation/places/web-service/nearby-search

const BASE_URL = 'https://places.googleapis.com/v1';

// billing depends on the field mask, so only request what the UI uses
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.currentOpeningHours.openNow',
  'places.primaryTypeDisplayName',
  'places.photos',
  'places.googleMapsUri',
].join(',');

// e.g. hotels that contain a restaurant
const EXCLUDED_PRIMARY_TYPES = [
  'lodging',
  'hotel',
  'motel',
  'gas_station',
  'convenience_store',
  'grocery_store',
  'supermarket',
  'movie_theater',
];

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export class PlacesError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'PlacesError';
    this.status = status;
  }
}

export function normalizePlace(p) {
  return {
    id: p.id,
    name: p.displayName?.text ?? 'Unnamed',
    address: p.formattedAddress ?? '',
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? 0,
    price: p.priceLevel in PRICE_LEVELS ? PRICE_LEVELS[p.priceLevel] : null,
    openNow: p.currentOpeningHours?.openNow ?? null,
    cuisine: p.primaryTypeDisplayName?.text ?? 'Restaurant',
    photo: p.photos?.[0]?.name ?? null,
    mapsUrl: p.googleMapsUri ?? null,
  };
}

async function googleError(res) {
  const body = await res.json().catch(() => ({}));
  return new PlacesError(res.status, body.error?.message || res.statusText || 'Google Places request failed');
}

export function createGooglePlaces({ apiKey, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('createGooglePlaces needs an apiKey');

  return {
    mode: 'google',

    async searchNearby({ lat, lng, radius, placeType }) {
      const res = await fetchImpl(`${BASE_URL}/places:searchNearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({
          includedTypes: [placeType],
          excludedPrimaryTypes: EXCLUDED_PRIMARY_TYPES,
          maxResultCount: 20,
          rankPreference: 'POPULARITY',
          locationRestriction: {
            circle: { center: { latitude: lat, longitude: lng }, radius },
          },
        }),
      });
      if (!res.ok) throw await googleError(res);
      const data = await res.json();
      return (data.places ?? []).map(normalizePlace);
    },

    async photoUrl(photoName, maxWidth = 480) {
      const url = `${BASE_URL}/${photoName}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true`;
      const res = await fetchImpl(url, { headers: { 'X-Goog-Api-Key': apiKey } });
      if (!res.ok) throw await googleError(res);
      const data = await res.json();
      return data.photoUri;
    },
  };
}
