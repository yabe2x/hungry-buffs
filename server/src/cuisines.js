// https://developers.google.com/maps/documentation/places/web-service/place-types
export const CUISINES = [
  { id: 'any', label: 'Anything', placeType: 'restaurant' },
  { id: 'pizza', label: 'Pizza', placeType: 'pizza_restaurant' },
  { id: 'burgers', label: 'Burgers', placeType: 'hamburger_restaurant' },
  { id: 'mexican', label: 'Mexican', placeType: 'mexican_restaurant' },
  { id: 'chinese', label: 'Chinese', placeType: 'chinese_restaurant' },
  { id: 'japanese', label: 'Japanese', placeType: 'japanese_restaurant' },
  { id: 'sushi', label: 'Sushi', placeType: 'sushi_restaurant' },
  { id: 'ramen', label: 'Ramen', placeType: 'ramen_restaurant' },
  { id: 'korean', label: 'Korean', placeType: 'korean_restaurant' },
  { id: 'thai', label: 'Thai', placeType: 'thai_restaurant' },
  { id: 'indian', label: 'Indian', placeType: 'indian_restaurant' },
  { id: 'mediterranean', label: 'Mediterranean', placeType: 'mediterranean_restaurant' },
  { id: 'italian', label: 'Italian', placeType: 'italian_restaurant' },
  { id: 'sandwiches', label: 'Sandwiches', placeType: 'sandwich_shop' },
  { id: 'breakfast', label: 'Breakfast', placeType: 'breakfast_restaurant' },
  { id: 'vegetarian', label: 'Vegetarian', placeType: 'vegetarian_restaurant' },
  { id: 'coffee', label: 'Coffee', placeType: 'coffee_shop' },
  { id: 'dessert', label: 'Dessert', placeType: 'dessert_shop' },
];

export function findCuisine(id) {
  return CUISINES.find((c) => c.id === id);
}
