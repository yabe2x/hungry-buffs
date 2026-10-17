export function miles(meters) {
  const mi = meters / 1609.34;
  return mi < 0.1 ? '< 0.1 mi' : `${mi.toFixed(1)} mi`;
}

// ~80 m/min walking pace
export function walkMinutes(meters) {
  return Math.max(1, Math.round(meters / 80));
}

export function priceSigns(price) {
  if (price == null) return '';
  if (price === 0) return 'Free';
  return '$'.repeat(price);
}

const EMOJI = [
  [/pizza/i, '🍕'], [/burger|hamburger/i, '🍔'], [/mexican|taco|burrito/i, '🌮'], [/sushi/i, '🍣'],
  [/ramen/i, '🍜'], [/japanese/i, '🍱'], [/chinese/i, '🥡'], [/korean/i, '🍲'], [/thai|vietnam/i, '🍛'],
  [/indian/i, '🍛'], [/mediterranean|greek|falafel/i, '🧆'], [/italian|pasta/i, '🍝'], [/sandwich|deli/i, '🥪'],
  [/breakfast|brunch|pancake/i, '🥞'], [/vegetarian|vegan|salad/i, '🥗'], [/coffee|cafe/i, '☕'],
  [/dessert|ice cream|gelato|bakery/i, '🍦'],
];

export function cuisineEmoji(cuisine = '') {
  return EMOJI.find(([rx]) => rx.test(cuisine))?.[1] ?? '🍽️';
}
