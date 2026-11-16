/**
 * Suggests a classification mode from the first nonempty field value.
 * Text values remain categorical, including identifiers containing digits.
 * @param {Object} layer Layer containing cached CSV records or GeoJSON features.
 * @param {string} field Selected field name.
 * @returns {string} Numeric or categorical type; numeric when no sample is available.
 */
export function suggestClassificationMode(layer, field) {
  const records =
    layer.csvData || (layer.features || []).map((feature) => feature.properties);
  for (const record of records) {
    const value = record[field];
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "number") return "analyse";
    return "categorized";
  }
  return "analyse";
}
