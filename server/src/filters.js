const EARTH_RADIUS_M = 6_371_000;

// haversine, meters
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Bayesian average so a 5.0 from 3 reviews doesn't beat a 4.7 from 2,000
const PRIOR_REVIEWS = 50;
const PRIOR_RATING = 4.0;
export function bestScore(place) {
  if (place.rating == null) return 0;
  const n = place.ratingCount ?? 0;
  return (n * place.rating + PRIOR_REVIEWS * PRIOR_RATING) / (n + PRIOR_REVIEWS);
}

/**
 * @param {object[]} places
 * @param {object} opts
 *   origin:    { lat, lng } to measure distance from
 *   openNow:   only places open right now
 *   maxPrice:  1-4 ($ to $$$$); places with unknown price are kept
 *   minRating: 0-5
 *   sort:      'best' | 'rating' | 'distance'
 */
export function applyFilters(places, { origin, openNow = false, maxPrice = 4, minRating = 0, sort = 'best' }) {
  const result = places
    .map((p) => ({ ...p, distance: Math.round(distanceMeters(origin.lat, origin.lng, p.lat, p.lng)) }))
    .filter((p) => !openNow || p.openNow === true)
    .filter((p) => p.price == null || p.price <= maxPrice)
    .filter((p) => minRating <= 0 || (p.rating ?? 0) >= minRating);

  const comparators = {
    best: (a, b) => bestScore(b) - bestScore(a),
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.ratingCount - a.ratingCount,
    distance: (a, b) => a.distance - b.distance,
  };
  return result.sort(comparators[sort] ?? comparators.best);
}

export function pickRandom(places, rng = Math.random) {
  if (places.length === 0) return null;
  return places[Math.floor(rng() * places.length)];
}
