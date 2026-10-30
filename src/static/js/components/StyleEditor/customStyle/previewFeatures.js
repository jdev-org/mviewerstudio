/**
 * Extrait un échantillon GeoJSON des données WFS ou des lignes CSV/Grist.
 * @param {Object} layer Données et paramètres de localisation de la couche.
 * @param {number} limit Nombre maximal de géométries.
 * @returns {Object[]} Entités GeoJSON conservant les propriétés du tableau.
 */
export function getPreviewFeatures(layer, limit) {
  const features = [];
  if (layer.type !== "csv") {
    for (const feature of layer.features || []) {
      if (!feature.geometry) continue;
      features.push(feature);
      if (features.length === limit) break;
    }
    return features;
  }
  for (const row of layer.csvData || []) {
    let geometries = [];
    if (layer.geojsonField) {
      let value = row[layer.geojsonField];
      if (!value) continue;
      if (typeof value === "string") {
        // Le téléchargement CSV Grist sérialise la géométrie dans une cellule texte.
        try {
          value = JSON.parse(value);
        } catch {
          continue;
        }
      }
      if (value.type === "FeatureCollection") {
        if (!Array.isArray(value.features)) continue;
        geometries = value.features.map((feature) => feature.geometry);
      } else if (value.type === "Feature") {
        geometries = [value.geometry];
      } else {
        geometries = [value];
      }
    } else {
      const values = [row[layer.xfield || "longitude"], row[layer.yfield || "latitude"]];
      const coordinates = values.map((value) => {
        if (typeof value === "number") return value;
        if (typeof value !== "string" || !value.trim()) return NaN;
        return +value.trim().replace(",", ".");
      });
      if (!coordinates.every(Number.isFinite)) continue;
      geometries = [{ type: "Point", coordinates }];
    }
    for (const geometry of geometries) {
      if (!geometry || !geometry.type) continue;
      // Les filtres SLD portent sur les colonnes Grist, même si la cellule contient un Feature.
      features.push({ type: "Feature", geometry, properties: row });
      // Limiter les géométries affichées : une seule ligne peut contenir une FeatureCollection.
      if (features.length === limit) return features;
    }
  }
  return features;
}
