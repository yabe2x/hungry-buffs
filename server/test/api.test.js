import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp, CU_BOULDER } from '../src/app.js';
import { TTLCache } from '../src/cache.js';
import { PlacesError } from '../src/places.js';

const NEAR = 0.002; // ~200 m
const FAKE = [
  { id: 'a', name: 'Close Cheap Open', lat: CU_BOULDER.lat + NEAR, lng: CU_BOULDER.lng, rating: 4.2, ratingCount: 900, price: 1, openNow: true },
  { id: 'b', name: 'Far Fancy Open', lat: CU_BOULDER.lat + 5 * NEAR, lng: CU_BOULDER.lng, rating: 4.8, ratingCount: 400, price: 4, openNow: true },
  { id: 'c', name: 'Mid Closed', lat: CU_BOULDER.lat + 2 * NEAR, lng: CU_BOULDER.lng, rating: 4.5, ratingCount: 200, price: 2, openNow: false },
  { id: 'd', name: 'Perfect But Few Reviews', lat: CU_BOULDER.lat + 3 * NEAR, lng: CU_BOULDER.lng, rating: 5.0, ratingCount: 3, price: 2, openNow: true },
  { id: 'e', name: 'No Price Info', lat: CU_BOULDER.lat + 4 * NEAR, lng: CU_BOULDER.lng, rating: 3.5, ratingCount: 50, price: null, openNow: null },
];

function fakePlaces() {
  const calls = [];
  return {
    mode: 'fake',
    calls,
    failNext: null,
    async searchNearby(params) {
      calls.push(params);
      if (this.failNext) {
        const err = this.failNext;
        this.failNext = null;
        throw err;
      }
      return FAKE;
    },
    async photoUrl(name) {
      return `https://images.example/${name}.jpg`;
    },
  };
}

let server, base, places;

before(async () => {
  places = fakePlaces();
  const app = createApp({ places, cache: new TTLCache() });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

async function get(path) {
  const res = await fetch(base + path, { redirect: 'manual' });
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  return { status: res.status, body, headers: res.headers };
}

const names = (body) => body.restaurants.map((r) => r.name);

describe('GET /api/restaurants', () => {
  it('returns restaurants with distances, defaulting to CU Boulder', async () => {
    const { status, body } = await get('/api/restaurants');
    assert.equal(status, 200);
    assert.equal(body.count, 5);
    const close = body.restaurants.find((r) => r.id === 'a');
    assert.ok(close.distance > 150 && close.distance < 300, `distance was ${close.distance}`);
    assert.deepEqual(
      { lat: places.calls[0].lat, lng: places.calls[0].lng, radius: places.calls[0].radius },
      { lat: CU_BOULDER.lat, lng: CU_BOULDER.lng, radius: 1500 },
    );
  });

  it('filters to places open now', async () => {
    const { body } = await get('/api/restaurants?openNow=true');
    assert.deepEqual(names(body).sort(), ['Close Cheap Open', 'Far Fancy Open', 'Perfect But Few Reviews']);
  });

  it('filters by max price but keeps places with no price info', async () => {
    const { body } = await get('/api/restaurants?maxPrice=1');
    assert.deepEqual(names(body).sort(), ['Close Cheap Open', 'No Price Info']);
  });

  it('filters by minimum rating', async () => {
    const { body } = await get('/api/restaurants?minRating=4.5');
    assert.deepEqual(names(body).sort(), ['Far Fancy Open', 'Mid Closed', 'Perfect But Few Reviews']);
  });

  it('sorts by distance', async () => {
    const { body } = await get('/api/restaurants?sort=distance');
    assert.deepEqual(names(body), ['Close Cheap Open', 'Mid Closed', 'Perfect But Few Reviews', 'No Price Info', 'Far Fancy Open']);
  });

  it('"best" sort does not let 3 reviews beat hundreds', async () => {
    const { body } = await get('/api/restaurants?sort=best');
    assert.equal(body.restaurants[0].name, 'Far Fancy Open'); // 4.8 from 400 reviews
    const perfect = names(body).indexOf('Perfect But Few Reviews');
    assert.ok(perfect > 0, '5.0 from 3 reviews should not rank first');
  });

  it('sends the cuisine to Google as a place type', async () => {
    await get('/api/restaurants?cuisine=ramen&lat=40.01&lng=-105.27');
    assert.equal(places.calls.at(-1).placeType, 'ramen_restaurant');
  });

  it('caches searches so Google is not called again', async () => {
    const before = places.calls.length;
    await get('/api/restaurants?lat=40.1&lng=-105.1&radius=2000');
    await get('/api/restaurants?lat=40.1&lng=-105.1&radius=2000&openNow=true&sort=distance');
    await get('/api/restaurants?lat=40.10001&lng=-105.10001&radius=2000');
    assert.equal(places.calls.length, before + 1);
  });

  for (const [query, why] of [
    ['lat=100', 'latitude out of range'],
    ['lng=abc', 'not a number'],
    ['radius=50', 'radius too small'],
    ['radius=50000', 'radius too big'],
    ['maxPrice=9', 'price out of range'],
    ['minRating=6', 'rating out of range'],
    ['cuisine=martian', 'unknown cuisine'],
    ['sort=random', 'unknown sort'],
  ]) {
    it(`rejects bad input with 400: ${why}`, async () => {
      const { status, body } = await get(`/api/restaurants?${query}`);
      assert.equal(status, 400);
      assert.ok(body.error);
    });
  }

  it('turns a Google failure into a 502 with the reason', async () => {
    places.failNext = new PlacesError(403, 'API key not valid');
    const { status, body } = await get('/api/restaurants?lat=40.2&lng=-105.2');
    assert.equal(status, 502);
    assert.match(body.error, /API key not valid/);
  });

  it('does not cache failures', async () => {
    places.failNext = new PlacesError(500, 'temporary');
    assert.equal((await get('/api/restaurants?lat=40.3&lng=-105.3')).status, 502);
    assert.equal((await get('/api/restaurants?lat=40.3&lng=-105.3')).status, 200);
  });
});

describe('GET /api/restaurants/random', () => {
  it('picks one restaurant that matches the filters', async () => {
    for (let i = 0; i < 20; i++) {
      const { status, body } = await get('/api/restaurants/random?openNow=true&maxPrice=2');
      assert.equal(status, 200);
      assert.ok(['Close Cheap Open', 'Perfect But Few Reviews'].includes(body.restaurant.name), body.restaurant.name);
      assert.equal(body.pickedFrom, 2);
    }
  });

  it('eventually picks every match (it is random, not always the first)', async () => {
    const seen = new Set();
    for (let i = 0; i < 60; i++) seen.add((await get('/api/restaurants/random')).body.restaurant.id);
    assert.equal(seen.size, 5);
  });

  it('returns 404 when nothing matches', async () => {
    const { status, body } = await get('/api/restaurants/random?minRating=5&openNow=true&maxPrice=1');
    assert.equal(status, 404);
    assert.match(body.error, /No restaurants/);
  });
});

describe('other endpoints', () => {
  it('GET /api/health reports the data source', async () => {
    assert.deepEqual((await get('/api/health')).body, { ok: true, source: 'fake' });
  });

  it('GET /api/cuisines lists cuisines', async () => {
    const { body } = await get('/api/cuisines');
    assert.ok(body.some((c) => c.id === 'pizza' && c.label === 'Pizza'));
  });

  it('GET /api/photo redirects to the image without exposing the key', async () => {
    const { status, headers } = await get('/api/photo?name=places/abc123/photos/xyz-789');
    assert.equal(status, 302);
    assert.equal(headers.get('location'), 'https://images.example/places/abc123/photos/xyz-789.jpg');
  });

  it('GET /api/photo rejects names that are not photo names', async () => {
    assert.equal((await get('/api/photo?name=../../secret')).status, 400);
    assert.equal((await get('/api/photo?name=places/a/photos/b?key=x')).status, 400);
  });

  it('unknown API routes are 404 JSON', async () => {
    const { status, body } = await get('/api/nope');
    assert.equal(status, 404);
    assert.equal(body.error, 'Not found');
  });
});
