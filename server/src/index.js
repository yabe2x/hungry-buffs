import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';
import { createGooglePlaces } from './places.js';
import { createSamplePlaces } from './sample-places.js';

const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const places = apiKey ? createGooglePlaces({ apiKey }) : createSamplePlaces();

const here = path.dirname(fileURLToPath(import.meta.url));
const app = createApp({ places, clientDist: path.join(here, '..', '..', 'client', 'dist') });

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Hungry Buffs API on http://localhost:${port}`);
  if (!apiKey) {
    console.log('No GOOGLE_PLACES_API_KEY set: serving SAMPLE restaurants. See README to add your key.');
  }
});
