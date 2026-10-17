function toQuery(origin, filters) {
  const params = new URLSearchParams({
    lat: origin.lat,
    lng: origin.lng,
    radius: filters.radius,
    cuisine: filters.cuisine,
    sort: filters.sort,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
  });
  if (filters.openNow) params.set('openNow', 'true');
  return params.toString();
}

async function getJSON(url, signal) {
  const res = await fetch(url, { signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export const api = {
  cuisines: (signal) => getJSON('/api/cuisines', signal),
  restaurants: (origin, filters, signal) => getJSON(`/api/restaurants?${toQuery(origin, filters)}`, signal),
  random: (origin, filters) => getJSON(`/api/restaurants/random?${toQuery(origin, filters)}`),
  photoUrl: (photoName) => `/api/photo?name=${encodeURIComponent(photoName)}`,
};
