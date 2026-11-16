import { STYLE_TYPES } from "../../../components/StyleEditor/constants.js";

/**
 * Loads classification records from authenticated CSV data or a WFS field request.
 * Numeric CSV values are normalized without changing the cached records.
 * @param {Object} layer Active layer and its cached data.
 * @param {string} layerId Technical layer name used for WFS requests.
 * @param {Object} parameters Selected field and representation type.
 * @returns {Promise<Object[]>} Records containing the field values.
 * @throws {Error} If the source is unavailable or the WFS response is invalid.
 */
export async function loadFieldValues(layer, layerId, { field, type }) {
  const { styleProp } = STYLE_TYPES.find((definition) => definition.value === type);
  let data;
  if (layer && layer.type === "csv") {
    if (!Array.isArray(layer.csvData)) {
      throw new Error(mviewer.tr("style_editor.error.csv_not_loaded"));
    }
    data = layer.csvData;
    // Preserve category text; numeric CSV values accept a decimal comma.
    if (!styleProp.includes("randomColor")) {
      data = data.map((record) => {
        let value = record[field];
        if (typeof value === "string") {
          value = value.trim();
          if (value === "") value = null;
          else value = +value.replace(",", ".");
        }
        return { [field]: value };
      });
    }
  } else {
    if (!layer || !layer.wfs_url) {
      throw new Error(mviewer.tr("style_editor.error.no_wfs"));
    }
    // Load all field values rather than using the preview sample.
    const url = ogc.urlToObject(layer.wfs_url, {
      SERVICE: "WFS",
      VERSION: "1.0.0",
      REQUEST: "GETFEATURE",
      OUTPUTFORMAT: "application/json",
      TYPENAME: layerId,
      PROPERTYNAME: field,
    });
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(mviewer.tr("style_editor.error.load_values"));
    }
    const collection = await response.json();
    if (!Array.isArray(collection.features)) {
      throw new Error(mviewer.tr("style_editor.error.invalid_data"));
    }
    data = collection.features.map((feature) => feature.properties);
  }
  return data;
}
