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
