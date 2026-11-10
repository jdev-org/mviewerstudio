/**
 * Calculate circle diameters with areas proportional to class midpoints.
 * Nonpositive midpoints produce a zero diameter.
 * @param {Object[]} rules Classes containing numeric min and max boundaries.
 * @param {number} maxSize Diameter of the largest circle in pixels.
 * @returns {number[]} One diameter per class, in the original order.
 */
export const calculateCircleSizes = (rules, maxSize) => {
  const values = rules.map((rule) => Math.max(0, rule.min / 2 + rule.max / 2));
  const maximum = Math.max(0, ...values);
  if (maximum === 0) return values.map(() => 0);
  return values.map((value) => maxSize * Math.sqrt(value / maximum));
};

/**
 * Calculate default cluster diameters from the midpoint of each count interval.
 * Normalize class midpoints so the first and last classes span the full radius range.
 * @param {Object[]} rules Positive count intervals with numeric min and max.
 * @param {number} minRadius Minimum radius in pixels.
 * @param {number} maxRadius Maximum radius in pixels.
 * @returns {number[]} Diameters matching the editor and GeoStyler conversion convention.
 */
export const calculateClusterSizes = (rules, minRadius, maxRadius) => {
  if (rules.length === 0) return [];
  const midpoints = rules.map((rule) => rule.min / 2 + rule.max / 2);
  const minimum = Math.min(...midpoints);
  const maximum = Math.max(...midpoints);
  const range = maximum - minimum;
  return midpoints.map((effectif) => {
    let ratio = 0;
    if (range > 0) ratio = (effectif - minimum) / range;
    const radius = minRadius + Math.sqrt(ratio) * (maxRadius - minRadius);
    return radius * 2;
  });
};
