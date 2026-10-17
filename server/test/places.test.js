import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TTLCache } from '../src/cache.js';
import { createGooglePlaces, normalizePlace, PlacesError } from '../src/places.js';
import { createSamplePlaces } from '../src/sample-places.js';

function fakeFetch(responseBody, { status = 200 } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(responseBody), { status, headers: { 'Content-Type': 'application/json' } });
  };
  fn.calls = calls;
  return fn;
}

describe('Google Places client', () => {
  it('sends a Nearby Search with the key in a header and a field mask', async () => {
    const fetchImpl = fakeFetch({ places: [] });
    const places = createGooglePlaces({ apiKey: 'TEST_KEY', fetchImpl });
    await places.searchNearby({ lat: 40, lng: -105, radius: 800, placeType: 'pizza_restaurant' });

    const { url, init } = fetchImpl.calls[0];
    assert.equal(url, 'https://places.googleapis.com/v1/places:searchNearby');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['X-Goog-Api-Key'], 'TEST_KEY');
    assert.match(init.headers['X-Goog-FieldMask'], /places\.displayName/);
    assert.ok(!url.includes('TEST_KEY'), 'key must not be in the URL');
    const body = JSON.parse(init.body);
    assert.deepEqual(body.includedTypes, ['pizza_restaurant']);
    assert.ok(body.excludedPrimaryTypes.includes('hotel'), 'hotels with a restaurant inside are left out');
    assert.deepEqual(body.locationRestriction.circle, { center: { latitude: 40, longitude: -105 }, radius: 800 });
  });

  it('normalizes Google place objects', () => {
    const p = normalizePlace({
      id: 'X1',
      displayName: { text: 'Test Pizza' },
      formattedAddress: '1 Main St',
      location: { latitude: 40.1, longitude: -105.2 },
      rating: 4.4,
      userRatingCount: 321,
      priceLevel: 'PRICE_LEVEL_MODERATE',
      currentOpeningHours: { openNow: false },
      primaryTypeDisplayName: { text: 'Pizza Restaurant' },
      photos: [{ name: 'places/X1/photos/P1' }],
      googleMapsUri: 'https://maps.google.com/?cid=1',
    });
    assert.deepEqual(p, {
      id: 'X1', name: 'Test Pizza', address: '1 Main St', lat: 40.1, lng: -105.2, rating: 4.4, ratingCount: 321,
      price: 2, openNow: false, cuisine: 'Pizza Restaurant', photo: 'places/X1/photos/P1', mapsUrl: 'https://maps.google.com/?cid=1',
    });
  });

  it('handles places with missing fields', () => {
    const p = normalizePlace({ id: 'Y', location: { latitude: 1, longitude: 2 } });
    assert.equal(p.name, 'Unnamed');
    assert.equal(p.price, null);
    assert.equal(p.openNow, null);
    assert.equal(p.photo, null);
  });

  it('throws PlacesError with Google\'s message on failure', async () => {
    const fetchImpl = fakeFetch({ error: { message: 'API key not valid. Please pass a valid API key.' } }, { status: 400 });
    const places = createGooglePlaces({ apiKey: 'BAD', fetchImpl });
    await assert.rejects(places.searchNearby({ lat: 0, lng: 0, radius: 100, placeType: 'restaurant' }), (err) => {
      assert.ok(err instanceof PlacesError);
      assert.equal(err.status, 400);
      assert.match(err.message, /API key not valid/);
      return true;
    });
  });

  it('asks for a photo URL instead of the image bytes', async () => {
    const fetchImpl = fakeFetch({ photoUri: 'https://lh3.googleusercontent.com/abc' });
    const places = createGooglePlaces({ apiKey: 'K', fetchImpl });
    const url = await places.photoUrl('places/A/photos/B');
    assert.equal(url, 'https://lh3.googleusercontent.com/abc');
    assert.match(fetchImpl.calls[0].url, /places\/A\/photos\/B\/media\?maxWidthPx=480&skipHttpRedirect=true/);
  });
});

describe('sample data (no API key)', () => {
  it('places sample restaurants inside the search radius', async () => {
    const places = await createSamplePlaces().searchNearby({ lat: 40, lng: -105, radius: 1000, placeType: 'restaurant' });
    assert.ok(places.length > 20);
    for (const p of places) {
      assert.match(p.name, /^Sample /);
      const dLat = (p.lat - 40) * 111_320;
      const dLng = (p.lng + 105) * 111_320 * Math.cos((40 * Math.PI) / 180);
      assert.ok(Math.hypot(dLat, dLng) <= 1001, `${p.name} is outside the radius`);
    }
  });

  it('filters sample data by cuisine', async () => {
    const places = await createSamplePlaces().searchNearby({ lat: 40, lng: -105, radius: 1000, placeType: 'pizza_restaurant' });
    assert.ok(places.length >= 1);
    assert.ok(places.every((p) => p.cuisine === 'Pizza Restaurant'));
  });
});

describe('TTLCache', () => {
  it('expires entries', () => {
    let now = 0;
    const cache = new TTLCache({ ttlMs: 100, now: () => now });
    cache.set('k', 1);
    assert.equal(cache.get('k'), 1);
    now = 150;
    assert.equal(cache.get('k'), undefined);
  });

  it('drops the oldest entry when full', () => {
    const cache = new TTLCache({ maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('c'), 3);
  });

  it('shares one in-flight request between simultaneous callers', async () => {
    const cache = new TTLCache();
    let calls = 0;
    const slow = () => new Promise((r) => setTimeout(() => r(++calls), 20));
    const [a, b] = await Promise.all([cache.getOrCompute('k', slow), cache.getOrCompute('k', slow)]);
    assert.equal(calls, 1);
    assert.equal(a, b);
  });
});
