# 🦬 Hungry Buffs

A full-stack restaurant finder for CU Boulder students. Set what you're craving, how far
you'll walk, your budget, and whether it has to be open right now. Hungry Buffs shows matching
places on a map, or picks one for you when nobody can decide.

**React** frontend · **Express** REST API · live data from the **Google Places API**

## Features

- **Live restaurant data** from Google Places (New) around campus or your current location
- **Filters**: 17 cuisines, distance (½–5 mi), max price ($–$$$$), minimum rating, open now
- **Smart sorting**: "Best match" ranks with a Bayesian average, so a 5.0 from 3 reviews
  doesn't beat a 4.7 from 2,000. You can also sort by top rated or closest.
- **🎲 Pick for me**: the server picks a random restaurant that fits your filters, while the
  UI spins through names like a slot machine
- **Map** (Leaflet + OpenStreetMap) with the search radius, your location, and clickable markers
- **Phone-friendly**: filters collapse on small screens

## Architecture

```
React (Vite)                      Express API                         Google Places API (New)
─────────────                     ───────────                         ───────────────────────
filters, list, map,   GET /api/restaurants?lat&lng&radius&...
picker modal        ───────────────────────────────►  validate input
                                                       check cache ──miss──► POST places:searchNearby
                                                       filter, sort,          (API key in a header,
                    ◄─── JSON ──────────────────────── add distances           field mask = only the
                                                                               fields we show)
                      GET /api/restaurants/random  ►  same, then pick one
                      GET /api/photo?name=...      ►  ask Google for the photo URL, redirect
```

| Endpoint | What it does |
|---|---|
| `GET /api/restaurants` | Restaurants near `lat,lng` within `radius` m, filtered by `cuisine`, `openNow`, `maxPrice` (1–4), and `minRating` (0–5), sorted by `best`, `rating`, or `distance` |
| `GET /api/restaurants/random` | One random restaurant that matches the same filters (404 if none) |
| `GET /api/photo?name=` | Redirects to a restaurant photo |
| `GET /api/cuisines` | The cuisine list |
| `GET /api/health` | Whether it's using real Google data or sample data |

Design decisions:
- **The API key never reaches the browser.** All Google calls happen on the server, with the key
  in a request header. Photos are fetched as short-lived public URLs, so the key isn't in any
  `<img>` tag either. The map uses OpenStreetMap, so no browser-side key is needed at all.
- **Caching keeps costs down.** Results are cached for 10 minutes, keyed by location rounded to
  about 100 m, so all the users near the UMC share one Google request. Filtering and sorting
  happen on the cached results, so changing filters costs nothing. Simultaneous identical
  searches share one in-flight request.
- **Field masks.** Google bills by the fields you request, so the server asks for exactly the
  11 fields the app displays.
- **Every input is validated** (coordinates, radius, price, rating, cuisine, sort) and returns
  a clear 400. Google failures become a 502 with Google's message.
- **Sample-data mode.** Without a key, the API serves clearly labeled sample restaurants, so the
  app and tests run anywhere.

## Run it

Needs Node 22 or newer.

```bash
npm install        # installs root, server, and client
npm run dev        # API on :3001 + React dev server on :5173 → open http://localhost:5173
```

Or run it like production, with Express serving the built React app:

```bash
npm run build
npm start          # → http://localhost:3001
```

```bash
npm test           # 36 API tests (no network or key needed)
```

## Adding your Google API key

Until you add a key, the app shows **sample** restaurants. To get real ones:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and **create a project**
   (for example, "hungry-buffs").
2. **Turn on billing** for the project (Billing → Link a billing account). Google requires it even
   for free usage. The Places API has a monthly free usage level, and this app's caching keeps
   it low, but check Google's current pricing page.
3. **Set a safety limit:** Billing → Budgets & alerts → create a small budget (like $5) with email
   alerts. You can also cap daily requests under APIs & Services → Places API (New) → Quotas.
4. **Enable the API:** APIs & Services → Library → search **"Places API (New)"** → Enable.
5. **Create the key:** APIs & Services → Credentials → Create credentials → API key.
   Then **restrict it**: under "API restrictions", allow only **Places API (New)**.
6. Copy `server/.env.example` to `server/.env` and paste your key after `GOOGLE_PLACES_API_KEY=`.
7. Restart the server. The yellow "sample restaurants" banner should disappear.

`server/.env` is in `.gitignore`, so the key won't be committed. Never put it in client code.

## Project layout

```
server/
  src/app.js            routes, validation, caching, error handling
  src/places.js         Google Places client (request + response mapping)
  src/filters.js        distance (haversine), filters, Bayesian sort, random pick
  src/cache.js          TTL cache with in-flight request sharing
  src/sample-places.js  sample data for running without a key
  test/                 node:test suites (API, Google client, cache)
client/
  src/App.jsx           page state, data fetching (with request cancellation)
  src/components/       Filters, RestaurantCard, MapView, PickerModal
```
