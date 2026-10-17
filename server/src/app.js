import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

import { TTLCache } from './cache.js';
import { CUISINES, findCuisine } from './cuisines.js';
import { applyFilters, pickRandom } from './filters.js';
import { PlacesError } from './places.js';

// the UMC
export const CU_BOULDER = { lat: 40.0068, lng: -105.2705 };

class BadRequest extends Error {}

function number(value, name, { min, max, fallback }) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new BadRequest(`${name} must be a number from ${min} to ${max}`);
  return n;
}

function bool(value) {
  return value === 'true' || value === '1';
}

function parseSearch(query) {
  const cuisine = findCuisine(query.cuisine ?? 'any');
  if (!cuisine) throw new BadRequest(`unknown cuisine "${query.cuisine}"`);
  const sort = query.sort ?? 'best';
  if (!['best', 'rating', 'distance'].includes(sort)) throw new BadRequest('sort must be best, rating, or distance');

  return {
    lat: number(query.lat, 'lat', { min: -90, max: 90, fallback: CU_BOULDER.lat }),
    lng: number(query.lng, 'lng', { min: -180, max: 180, fallback: CU_BOULDER.lng }),
    radius: number(query.radius, 'radius', { min: 100, max: 10000, fallback: 1500 }),
    cuisine,
    openNow: bool(query.openNow),
    maxPrice: number(query.maxPrice, 'maxPrice', { min: 1, max: 4, fallback: 4 }),
    minRating: number(query.minRating, 'minRating', { min: 0, max: 5, fallback: 0 }),
    sort,
  };
}

export function createApp({ places, cache = new TTLCache(), clientDist } = {}) {
  const app = express();
  app.disable('x-powered-by');

  async function search(params) {
    // ~100 m buckets so nearby searches share a cache entry
    const key = [params.lat.toFixed(3), params.lng.toFixed(3), params.radius, params.cuisine.placeType].join('|');
    const found = await cache.getOrCompute(key, () =>
      places.searchNearby({
        lat: params.lat,
        lng: params.lng,
        radius: params.radius,
        placeType: params.cuisine.placeType,
      }),
    );
    return applyFilters(found, {
      origin: { lat: params.lat, lng: params.lng },
      openNow: params.openNow,
      maxPrice: params.maxPrice,
      minRating: params.minRating,
      sort: params.sort,
    });
  }

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, source: places.mode });
  });

  app.get('/api/cuisines', (req, res) => {
    res.json(CUISINES.map(({ id, label }) => ({ id, label })));
  });

  app.get('/api/restaurants', async (req, res, next) => {
    try {
      const params = parseSearch(req.query);
      const restaurants = await search(params);
      res.json({ source: places.mode, count: restaurants.length, restaurants });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/restaurants/random', async (req, res, next) => {
    try {
      const params = parseSearch(req.query);
      const restaurants = await search(params);
      const pick = pickRandom(restaurants);
      if (!pick) return res.status(404).json({ error: 'No restaurants match your filters. Try widening them.' });
      res.json({ source: places.mode, pickedFrom: restaurants.length, restaurant: pick });
    } catch (err) {
      next(err);
    }
  });

  // redirects to a public photo URL so the API key never reaches the browser
  app.get('/api/photo', async (req, res, next) => {
    try {
      const name = String(req.query.name ?? '');
      if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) throw new BadRequest('invalid photo name');
      const url = await cache.getOrCompute(`photo|${name}`, () => places.photoUrl(name));
      if (!url) return res.status(404).json({ error: 'No photo' });
      res.set('Cache-Control', 'public, max-age=3600').redirect(url);
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  if (clientDist && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    if (err instanceof PlacesError) {
      console.error(`Google Places error (${err.status}): ${err.message}`);
      return res.status(502).json({ error: `Google Places request failed: ${err.message}` });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
