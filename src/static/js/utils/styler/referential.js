import { getGristCsvTableInfo } from "../grist/utils.js";
import { clearGristCsv } from "../grist/csvSource.js";
import { DATA_PREVIEW_LIMIT } from "../../components/StyleEditor/constants.js";

// Les promesses partagées évitent aussi de doubler une requête encore en cours.
// Un nouveau tableau de données crée un nouveau cache ; les anciens peuvent être libérés avec leur source.
const previewRequests = new WeakMap();
const preparationRequests = new WeakMap();

/**
 * Retrouve le référentiel configuré par son nom de couche, y compris ses centroïdes.
 * @param {Object} layer Couche ou options du Styler.
 * @returns {Object|undefined} Configuration du référentiel.
 */
export function getStyleReferential(layer) {
  if (typeof _conf === "undefined" || !_conf.grist) return;
  let names = [
    layer.gristRepresentationLayer,
    layer.layer_name,
    layer.layername,
    layer.id,
    layer.name,
    layer.layerId,
  ];
  if (layer.customStyle) names.push(layer.customStyle.referentialLayer);
  if (layer.gristReferential) names = [layer.gristReferential];
  return (_conf.grist.grist_referentials || []).find((referential) =>
    names.some(
      (name) =>
        name && [referential.layer_name, referential.centroide_layer_name].includes(name)
    )
  );
}

/**
 * Décrit les supports disponibles et les colonnes CSV qui portent leurs géométries.
 * @param {Object} layer Couche éditée.
 * @returns {Object[]} Supports compatibles avec le référentiel.
 */
export function getRepresentationSupports(layer) {
  const referential = getStyleReferential(layer);
  if (!referential || !referential.centroide_layer_name) return [];
  const fields = {
    Polygon: layer.gristGeometryField || referential.geometry_field_name,
    Point: layer.gristCentroidField || referential.centroid_field_name,
  };
  if (layer.geojsonField) {
    // Le nom issu du XML prime sur les noms par défaut, pour le support déjà utilisé par la couche.
    let geometry = "Polygon";
    if (
      layer.geojsonField === fields.Point ||
      layer.gristRepresentationLayer === referential.centroide_layer_name ||
      layer.id === referential.centroide_layer_name ||
      (layer.customStyle && layer.customStyle.geometry === "Point")
    )
      geometry = "Point";
    fields[geometry] = layer.geojsonField;
  }
  return ["Polygon", "Point"].map((geometry) => ({
    geometry,
    referential,
    layerName:
      geometry === "Point" ? referential.centroide_layer_name : referential.layer_name,
    geojsonField: fields[geometry],
  }));
}

/**
 * Charge un échantillon du support configuré, en conservant les attributs des lignes.
 * @param {Object} layer Données CSV ou WFS chargées.
 * @param {Object} support Support choisi dans le Styler.
 * @returns {Promise<Object[]>} Entités GeoJSON de l'aperçu, sans écriture dans Grist.
 */
export async function loadReferentialPreview(layer, support) {
  const referential = support.referential;
  const matchingField = layer.gristMatchingField || referential.join_field;
  const sourceRows = layer.type === "csv" ? layer.csvData : layer.features;
  if (!sourceRows || !sourceRows.length) return [];
  let rows = sourceRows.map((feature) => feature.properties);
  if (layer.type === "csv") rows = sourceRows;
  rows = rows
    .filter(
      (row) =>
        row[matchingField] !== undefined &&
        row[matchingField] !== null &&
        row[matchingField] !== ""
    )
    .slice(0, DATA_PREVIEW_LIMIT);
  if (!rows.length) return [];
  const payload = {
    referential_label: referential.label,
    geometry: support.geometry,
    values: [...new Set(rows.map((row) => normalizeJoinValue(row[matchingField])))],
  };
  const key = JSON.stringify([
    referential.layer_url,
    support.layerName,
    referential.srs,
    payload,
  ]);
  let requests = previewRequests.get(sourceRows);
  if (!requests) {
    requests = new Map();
    previewRequests.set(sourceRows, requests);
  }
  if (!requests.has(key)) {
    const request = fetch("api/grist/refgeo/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(mviewer.tr("style_editor.error.referential"));
        return response.json();
      })
      .catch((error) => {
        requests.delete(key);
        throw error;
      });
    requests.set(key, request);
  }
  const collection = await requests.get(key);
  const features = [];
  for (const row of rows) {
    const feature = collection.features.find(
      (item) =>
        normalizeJoinValue(item.properties[referential.join_field]) ===
        normalizeJoinValue(row[matchingField])
    );
    if (!feature || !feature.geometry) continue;
    const properties = { ...row };
    delete properties[layer.geojsonField];
    delete properties[support.geojsonField];
    delete properties[layer.gristGeometryField];
    delete properties[layer.gristCentroidField];
    delete properties[referential.geometry_field_name];
    delete properties[referential.centroid_field_name];
    features.push({ type: "Feature", geometry: feature.geometry, properties });
  }
  return features;
}

/**
 * Prépare les colonnes du support CSV ; complète une ancienne table uniquement à la sauvegarde.
 * @param {Object} layer Couche Grist à enregistrer.
 * @param {Object} data Cache des données CSV chargées.
 * @param {Object} support Support sélectionné.
 * @param {Object} source Source Grist authentifiée.
 * @returns {Promise<Object>} Noms réels des colonnes GeoJSON dans Grist.
 */
export function prepareGristRepresentation(layer, data, support, source) {
  const sourceRows = data.csvData || data;
  let requests = preparationRequests.get(sourceRows);
  if (!requests) {
    requests = new Map();
    preparationRequests.set(sourceRows, requests);
  }
  const key = JSON.stringify([
    layer.url,
    support.layerName,
    support.geometry,
    support.geojsonField,
    layer.gristMatchingField,
  ]);
  if (!requests.has(key)) {
    const request = prepareGristColumns(layer, data, support, source).catch((error) => {
      requests.delete(key);
      throw error;
    });
    requests.set(key, request);
  }
  return requests.get(key);
}

/**
 * Complète uniquement le support manquant et actualise les colonnes connues du cache.
 * @param {Object} layer Couche Grist à enregistrer.
 * @param {Object} data Cache des données CSV.
 * @param {Object} support Support choisi.
 * @param {Object} source Source authentifiée.
 * @returns {Promise<Object>} Noms des colonnes du support.
 */
async function prepareGristColumns(layer, data, support, source) {
  const supports = getRepresentationSupports(layer);
  const polygonSupport = supports.find((item) => item.geometry === "Polygon");
  const centroidSupport = supports.find((item) => item.geometry === "Point");
  let polygonField = layer.gristGeometryField || support.referential.geometry_field_name;
  let centroidField = layer.gristCentroidField || support.referential.centroid_field_name;
  if (polygonSupport) polygonField = polygonSupport.geojsonField;
  if (centroidSupport) centroidField = centroidSupport.geojsonField;
  if (support.geometry === "Point") centroidField = support.geojsonField;
  else polygonField = support.geojsonField;
  let geometryField = support.geojsonField;
  const hasGeometryColumn =
    Object.hasOwn(data.fields || {}, geometryField) ||
    (data.csvData || []).some((row) => Object.hasOwn(row, geometryField));
  if (!hasGeometryColumn) {
    const table = getGristCsvTableInfo(layer.url);
    if (!table || !source || !source.validatedApiKey)
      throw new Error(mviewer.tr("style_editor.error.referential"));
    const response = await fetch("api/grist/refgeo/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${source.validatedApiKey}`,
      },
      body: JSON.stringify({
        doc_id: table.docId,
        table_id: table.tableId,
        matching_field: layer.gristMatchingField || support.referential.join_field,
        referential_label: support.referential.label,
        output_format: "geojson",
        geometry_support: support.geometry,
        geometry_field: polygonField,
        centroid_field: centroidField,
      }),
    });
    if (!response.ok) throw new Error(mviewer.tr("style_editor.error.referential"));
    const result = await response.json();
    polygonField = result.geometry_field;
    centroidField = result.centroid_field;
    geometryField = polygonField;
    if (support.geometry === "Point") geometryField = centroidField;
    if (!geometryField || !result.matched_rows)
      throw new Error(mviewer.tr("style_editor.error.referential"));
    clearGristCsv(layer.url);
    if (result.rows) {
      // Réutiliser les géométries de la jointure évite de télécharger de nouveau le CSV pour l'aperçu.
      const matchingField = layer.gristMatchingField || support.referential.join_field;
      const geometries = new Map(
        result.rows.map((row) => [
          normalizeJoinValue(row[matchingField]),
          row[support.geojsonField],
        ])
      );
      data.csvData = (data.csvData || []).map((row) => ({
        ...row,
        [geometryField]: geometries.get(normalizeJoinValue(row[matchingField])) || null,
      }));
    }
  }
  if (!data.fields) data.fields = {};
  data.fields[geometryField] = {};
  return { geometryField, polygonField, centroidField };
}

/**
 * Normalise une valeur de jointure comme le service Python (espaces et suffixe .0).
 * @param {string|number} value Valeur provenant de Grist ou du WFS.
 * @returns {string} Valeur comparable.
 */
function normalizeJoinValue(value) {
  return `${value}`.trim().replace(/\.0$/, "");
}
