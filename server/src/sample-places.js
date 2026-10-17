// Used when GOOGLE_PLACES_API_KEY isn't set.

const TEMPLATES = [
  ['Sample Slice Pizza', 'pizza_restaurant', 'Pizza Restaurant', 4.5, 812, 1],
  ['Sample Brick Oven', 'pizza_restaurant', 'Pizza Restaurant', 4.1, 233, 2],
  ['Sample Burger Bar', 'hamburger_restaurant', 'Hamburger Restaurant', 4.3, 1204, 2],
  ['Sample Smash Burgers', 'hamburger_restaurant', 'Hamburger Restaurant', 3.9, 410, 1],
  ['Sample Taqueria', 'mexican_restaurant', 'Mexican Restaurant', 4.6, 958, 1],
  ['Sample Burrito Co.', 'mexican_restaurant', 'Mexican Restaurant', 4.0, 377, 1],
  ['Sample Dumpling House', 'chinese_restaurant', 'Chinese Restaurant', 4.4, 521, 2],
  ['Sample Wok', 'chinese_restaurant', 'Chinese Restaurant', 3.7, 189, 1],
  ['Sample Sushi Bar', 'sushi_restaurant', 'Sushi Restaurant', 4.7, 644, 3],
  ['Sample Izakaya', 'japanese_restaurant', 'Japanese Restaurant', 4.5, 302, 3],
  ['Sample Ramen Shop', 'ramen_restaurant', 'Ramen Restaurant', 4.6, 733, 2],
  ['Sample Korean BBQ', 'korean_restaurant', 'Korean Restaurant', 4.4, 455, 3],
  ['Sample Thai Kitchen', 'thai_restaurant', 'Thai Restaurant', 4.2, 611, 2],
  ['Sample Curry House', 'indian_restaurant', 'Indian Restaurant', 4.5, 540, 2],
  ['Sample Falafel Stand', 'mediterranean_restaurant', 'Mediterranean Restaurant', 4.8, 290, 1],
  ['Sample Trattoria', 'italian_restaurant', 'Italian Restaurant', 4.3, 388, 3],
  ['Sample Pasta Bar', 'italian_restaurant', 'Italian Restaurant', 4.6, 812, 4],
  ['Sample Sub Shop', 'sandwich_shop', 'Sandwich Shop', 4.1, 266, 1],
  ['Sample Deli', 'sandwich_shop', 'Sandwich Shop', 4.4, 143, 1],
  ['Sample Pancake House', 'breakfast_restaurant', 'Breakfast Restaurant', 4.5, 990, 2],
  ['Sample Green Bowl', 'vegetarian_restaurant', 'Vegetarian Restaurant', 4.6, 417, 2],
  ['Sample Espresso', 'coffee_shop', 'Coffee Shop', 4.7, 1530, 1],
  ['Sample Gelato', 'dessert_shop', 'Dessert Shop', 4.8, 701, 1],
  ['Sample Diner', 'american_restaurant', 'American Restaurant', 3.8, 512, 2],
];

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function createSamplePlaces() {
  return {
    mode: 'sample',

    async searchNearby({ lat, lng, radius, placeType }) {
      const rand = seeded(42);
      const places = TEMPLATES.map(([name, type, cuisine, rating, ratingCount, price], i) => {
        const dist = radius * (0.1 + 0.9 * rand());
        const angle = 2 * Math.PI * rand();
        const dLat = (dist * Math.cos(angle)) / 111_320;
        const dLng = (dist * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
        return {
          id: `sample-${i}`,
          name,
          type,
          address: `${100 + i * 37} Sample St, Boulder, CO`,
          lat: lat + dLat,
          lng: lng + dLng,
          rating,
          ratingCount,
          price,
          openNow: i % 4 !== 0,
          cuisine,
          photo: null,
          mapsUrl: null,
        };
      });
      return places
        .filter((p) => placeType === 'restaurant' || p.type === placeType)
        .map(({ type, ...rest }) => rest); // eslint-disable-line no-unused-vars
    },

    async photoUrl() {
      return null;
    },
  };
}
